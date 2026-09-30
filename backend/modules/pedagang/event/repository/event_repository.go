package repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	"cfd-backend/modules/pedagang/event/entity"
	"cfd-backend/modules/shared/eventaturan"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrBelumPunyaProfil      = errors.New("lengkapi data usaha dulu sebelum ikut event")
	ErrEventTidakDitemukan   = errors.New("event tidak ditemukan")
	ErrPendaftaranBelumBuka  = errors.New("pendaftaran event ini belum dibuka")
	ErrPendaftaranDitutup    = errors.New("pendaftaran event ini sudah ditutup")
	ErrSudahIkut             = errors.New("kamu sudah terdaftar di event ini")
	ErrSudahBatal            = errors.New("kamu sudah membatalkan pendaftaran di event ini, tidak bisa ikut lagi")
	ErrKuotaPenuh            = errors.New("kuota untuk kategori pedagangmu di event ini sudah penuh")
	ErrBelumIkut             = errors.New("kamu belum terdaftar di event ini")
	ErrTidakBisaBatal        = errors.New("pendaftaran ini tidak bisa dibatalkan lagi")
	ErrKeikutsertaanNotFound = errors.New("data keikutsertaan tidak ditemukan")
)

// ErrJadwalBentrok membawa nama event yang bentrok.
type ErrJadwalBentrok struct{ NamaEvent string }

func (e *ErrJadwalBentrok) Error() string {
	return fmt.Sprintf("jadwal bentrok dengan event \"%s\" yang sudah kamu ikuti", e.NamaEvent)
}

type EventRepository struct {
	db *pgxpool.Pool
}

func NewEventRepository(db *pgxpool.Pool) *EventRepository {
	return &EventRepository{db: db}
}

// GetPedagang: id profil + kategori (lama/baru) milik user yang login.
func (r *EventRepository) GetPedagang(ctx context.Context, userID string) (string, string, error) {
	var id, kategori string
	err := r.db.QueryRow(ctx, `
		SELECT id, kategori::text FROM pedagang_profiles
		WHERE user_id = $1 AND deleted_at IS NULL`, userID).Scan(&id, &kategori)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", "", ErrBelumPunyaProfil
	}
	return id, kategori, err
}

// ListEventTersedia: event terjadwal mulai hari ini (WIB) ke depan, lengkap
// dengan sebaran titik lokasi dan status keikutsertaan pedagang ini.
func (r *EventRepository) ListEventTersedia(ctx context.Context, pedagangID string) ([]entity.EventTersedia, map[string][]entity.LapakSisa, error) {
	rows, err := r.db.Query(ctx, `
		SELECT e.id, e.nama, e.tanggal::text,
		       to_char(e.jam_mulai, 'HH24:MI'), to_char(e.jam_selesai, 'HH24:MI'),
		       e.keterangan, e.status::text,
		       e.pendaftaran_buka_at, e.pendaftaran_tutup_at, e.lepas_kuota_at,
		       ((e.tanggal + e.jam_mulai) AT TIME ZONE 'Asia/Jakarta'),
		       p.status::text
		FROM events e
		LEFT JOIN event_participants p
		       ON p.event_id = e.id AND p.pedagang_id = $1 AND p.deleted_at IS NULL
		WHERE e.deleted_at IS NULL
		  AND e.status = 'terjadwal'
		  AND e.tanggal >= (now() AT TIME ZONE 'Asia/Jakarta')::date
		ORDER BY e.tanggal, e.jam_mulai, e.nama`, pedagangID)
	if err != nil {
		return nil, nil, err
	}
	defer rows.Close()

	list := make([]entity.EventTersedia, 0)
	ids := make([]string, 0)
	for rows.Next() {
		var ev entity.EventTersedia
		if err := rows.Scan(&ev.ID, &ev.Nama, &ev.Tanggal, &ev.JamMulai, &ev.JamSelesai,
			&ev.Keterangan, &ev.Status,
			&ev.PendaftaranBukaAt, &ev.PendaftaranTutupAt, &ev.LepasKuotaAt,
			&ev.MulaiAt, &ev.StatusSaya); err != nil {
			return nil, nil, err
		}
		list = append(list, ev)
		ids = append(ids, ev.ID)
	}
	if err := rows.Err(); err != nil {
		return nil, nil, err
	}
	if len(ids) == 0 {
		return list, map[string][]entity.LapakSisa{}, nil
	}

	lapak, err := r.lapakPerEvent(ctx, ids)
	if err != nil {
		return nil, nil, err
	}
	return list, lapak, nil
}

func (r *EventRepository) lapakPerEvent(ctx context.Context, eventIDs []string) (map[string][]entity.LapakSisa, error) {
	rows, err := r.db.Query(ctx, `
		SELECT v.event_id, kec.nama_instansi, v.nama_jalan, v.nama_ruas,
		       v.sisa_lama::int, v.sisa_baru::int
		FROM v_event_lapak_kuota v
		JOIN master_ruas r ON r.id = v.ruas_id
		LEFT JOIN LATERAL (
			SELECT mi.nama_instansi
			FROM jalan_instansi ji
			JOIN master_instansi mi ON mi.id = ji.instansi_id AND mi.deleted_at IS NULL
			WHERE ji.jalan_id = v.jalan_id
			LIMIT 1
		) kec ON true
		WHERE v.event_id = ANY($1::uuid[])
		ORDER BY kec.nama_instansi NULLS LAST, v.nama_jalan, r.urutan`, eventIDs)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	hasil := map[string][]entity.LapakSisa{}
	for rows.Next() {
		var eventID string
		var l entity.LapakSisa
		if err := rows.Scan(&eventID, &l.NamaKecamatan, &l.NamaJalan, &l.NamaRuas, &l.SisaLama, &l.SisaBaru); err != nil {
			return nil, err
		}
		hasil[eventID] = append(hasil[eventID], l)
	}
	return hasil, rows.Err()
}

type lapakKunci struct {
	id        string
	kuotaLama int
	kuotaBaru int
	sisa      map[string]int // "lama"/"baru" -> sisa
	terpakai  map[int]bool
}

// Ikut: pedagang ikut event. Server memilih titik (ruas) dan nomor stand
// secara acak dari kuota yang masih tersisa untuk kategorinya, lalu hasilnya
// langsung dikunci. Semua di dalam satu transaksi dengan baris event_lapak
// dikunci FOR UPDATE, jadi dua pedagang yang menekan bersamaan diproses
// bergantian dan tidak bisa dapat nomor yang sama.
//
// Aturan kuota:
//   - pedagang lama hanya memakai kuota lama;
//   - pedagang baru memakai kuota baru; setelah lepas_kuota_at, kalau kuota
//     baru sudah habis, boleh memakai sisa kuota lama.
//
// Pemilihan titik diberi bobot sisa kuota, jadi setiap lapak kosong punya
// peluang yang sama (titik dengan sisa 10 lebih mungkin terpilih daripada
// titik dengan sisa 1).
func (r *EventRepository) Ikut(ctx context.Context, eventID, pedagangID, kategori, userID string) (string, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return "", err
	}
	defer tx.Rollback(ctx)

	var status, tanggal, jamMulai, jamSelesai string
	var bukaAt, tutupAt, lepasAt *time.Time
	var mulaiAt time.Time
	err = tx.QueryRow(ctx, `
		SELECT status::text, tanggal::text, jam_mulai::text, jam_selesai::text,
		       pendaftaran_buka_at, pendaftaran_tutup_at, lepas_kuota_at,
		       ((tanggal + jam_mulai) AT TIME ZONE 'Asia/Jakarta')
		FROM events WHERE id = $1 AND deleted_at IS NULL
		FOR SHARE`, eventID).Scan(&status, &tanggal, &jamMulai, &jamSelesai, &bukaAt, &tutupAt, &lepasAt, &mulaiAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", ErrEventTidakDitemukan
	}
	if err != nil {
		return "", err
	}

	now := time.Now()
	switch eventaturan.StatusPendaftaran(status, bukaAt, tutupAt, mulaiAt, now) {
	case eventaturan.PendaftaranBelumDibuka:
		return "", ErrPendaftaranBelumBuka
	case eventaturan.PendaftaranDitutup:
		return "", ErrPendaftaranDitutup
	}

	var statusLama string
	err = tx.QueryRow(ctx, `
		SELECT status::text FROM event_participants
		WHERE event_id = $1 AND pedagang_id = $2 AND deleted_at IS NULL`,
		eventID, pedagangID).Scan(&statusLama)
	if err == nil {
		if statusLama == eventaturan.PesertaBatal {
			return "", ErrSudahBatal
		}
		return "", ErrSudahIkut
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return "", err
	}

	var namaBentrok string
	err = tx.QueryRow(ctx, `
		SELECT e2.nama
		FROM event_participants p
		JOIN events e2 ON e2.id = p.event_id AND e2.deleted_at IS NULL
		WHERE p.pedagang_id = $2 AND p.deleted_at IS NULL
		  AND p.status IN ('terdaftar', 'check_in')
		  AND e2.id <> $1 AND e2.status <> 'dibatalkan'
		  AND e2.tanggal = $3::date
		  AND e2.jam_mulai < $5::time AND e2.jam_selesai > $4::time
		LIMIT 1`, eventID, pedagangID, tanggal, jamMulai, jamSelesai).Scan(&namaBentrok)
	if err == nil {
		return "", &ErrJadwalBentrok{NamaEvent: namaBentrok}
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return "", err
	}

	// Kunci semua titik event ini.
	rows, err := tx.Query(ctx, `
		SELECT id, kuota_lama, kuota_baru FROM event_lapak
		WHERE event_id = $1 AND deleted_at IS NULL
		ORDER BY id
		FOR UPDATE`, eventID)
	if err != nil {
		return "", err
	}
	var lapak []*lapakKunci
	byID := map[string]*lapakKunci{}
	for rows.Next() {
		l := &lapakKunci{terpakai: map[int]bool{}}
		if err := rows.Scan(&l.id, &l.kuotaLama, &l.kuotaBaru); err != nil {
			rows.Close()
			return "", err
		}
		l.sisa = map[string]int{eventaturan.KategoriLama: l.kuotaLama, eventaturan.KategoriBaru: l.kuotaBaru}
		lapak = append(lapak, l)
		byID[l.id] = l
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return "", err
	}

	rows, err = tx.Query(ctx, `
		SELECT event_lapak_id, kuota_dipakai::text, nomor FROM event_participants
		WHERE event_id = $1 AND status <> 'batal' AND deleted_at IS NULL`, eventID)
	if err != nil {
		return "", err
	}
	for rows.Next() {
		var lapakID, pool string
		var nomor int
		if err := rows.Scan(&lapakID, &pool, &nomor); err != nil {
			rows.Close()
			return "", err
		}
		if l, ok := byID[lapakID]; ok {
			l.sisa[pool]--
			l.terpakai[nomor] = true
		}
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return "", err
	}

	pools := []string{eventaturan.KategoriLama}
	if kategori == eventaturan.KategoriBaru {
		pools = []string{eventaturan.KategoriBaru}
		if eventaturan.KuotaLamaDilepas(lepasAt, now) {
			pools = append(pools, eventaturan.KategoriLama)
		}
	}

	var pilih *lapakKunci
	var poolDipakai string
	var ukuranKumpulan int
	for _, pool := range pools {
		total := 0
		for _, l := range lapak {
			if l.sisa[pool] > 0 {
				total += l.sisa[pool]
			}
		}
		if total == 0 {
			continue
		}
		n, err := eventaturan.RandIntn(total)
		if err != nil {
			return "", err
		}
		for _, l := range lapak {
			if l.sisa[pool] <= 0 {
				continue
			}
			if n < l.sisa[pool] {
				pilih = l
				break
			}
			n -= l.sisa[pool]
		}
		poolDipakai, ukuranKumpulan = pool, total
		break
	}
	if pilih == nil {
		return "", ErrKuotaPenuh
	}

	kapasitas := pilih.kuotaLama + pilih.kuotaBaru
	kosong := make([]int, 0, kapasitas)
	for nomor := 1; nomor <= kapasitas; nomor++ {
		if !pilih.terpakai[nomor] {
			kosong = append(kosong, nomor)
		}
	}
	if len(kosong) == 0 {
		return "", ErrKuotaPenuh
	}
	idx, err := eventaturan.RandIntn(len(kosong))
	if err != nil {
		return "", err
	}
	nomor := kosong[idx]

	var pesertaID string
	err = tx.QueryRow(ctx, `
		INSERT INTO event_participants
			(event_id, pedagang_id, event_lapak_id, nomor, kategori, kuota_dipakai, status)
		VALUES ($1, $2, $3, $4, $5::kategori_pedagang, $6::kategori_pedagang, 'terdaftar')
		RETURNING id`,
		eventID, pedagangID, pilih.id, nomor, kategori, poolDipakai).Scan(&pesertaID)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return "", ErrSudahIkut
		}
		return "", err
	}

	// Bukti pengacakan: ukuran kumpulan saat diacak dan hasilnya.
	if err := eventaturan.Audit(ctx, tx, &userID, "peserta.ikut", "event_participants", &pesertaID, &eventID, nil,
		map[string]any{
			"pedagangId":        pedagangID,
			"kategori":          kategori,
			"kuotaDipakai":      poolDipakai,
			"ukuranKumpulan":    ukuranKumpulan,
			"eventLapakId":      pilih.id,
			"jumlahNomorKosong": len(kosong),
			"nomor":             nomor,
		}, nil); err != nil {
		return "", err
	}

	if err := tx.Commit(ctx); err != nil {
		return "", err
	}
	return pesertaID, nil
}

// Batal: hanya selama pendaftaran event masih dibuka dan pedagang belum
// check-in. Nomor kembali ke kumpulan; pedagang tidak bisa ikut lagi di
// event yang sama (baris 'batal' tetap ada).
func (r *EventRepository) Batal(ctx context.Context, eventID, pedagangID, userID string) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	var pesertaID, statusPeserta, statusEvent string
	var nomor int
	var eventLapakID string
	var bukaAt, tutupAt *time.Time
	var mulaiAt time.Time
	err = tx.QueryRow(ctx, `
		SELECT p.id, p.status::text, p.nomor, p.event_lapak_id,
		       e.status::text, e.pendaftaran_buka_at, e.pendaftaran_tutup_at,
		       ((e.tanggal + e.jam_mulai) AT TIME ZONE 'Asia/Jakarta')
		FROM event_participants p
		JOIN events e ON e.id = p.event_id AND e.deleted_at IS NULL
		WHERE p.event_id = $1 AND p.pedagang_id = $2 AND p.deleted_at IS NULL
		FOR UPDATE OF p`, eventID, pedagangID).Scan(
		&pesertaID, &statusPeserta, &nomor, &eventLapakID, &statusEvent, &bukaAt, &tutupAt, &mulaiAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrBelumIkut
	}
	if err != nil {
		return err
	}
	if statusPeserta != eventaturan.PesertaTerdaftar ||
		eventaturan.StatusPendaftaran(statusEvent, bukaAt, tutupAt, mulaiAt, time.Now()) != eventaturan.PendaftaranDibuka {
		return ErrTidakBisaBatal
	}

	if _, err := tx.Exec(ctx, `
		UPDATE event_participants SET status = 'batal', batal_at = now(), updated_at = now()
		WHERE id = $1`, pesertaID); err != nil {
		return err
	}
	if err := eventaturan.Audit(ctx, tx, &userID, "peserta.batal", "event_participants", &pesertaID, &eventID,
		map[string]any{"status": statusPeserta, "eventLapakId": eventLapakID, "nomor": nomor},
		map[string]any{"status": eventaturan.PesertaBatal}, nil); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

const selectKeikutsertaan = `
	SELECT p.id, e.id, e.nama, e.tanggal::text,
	       to_char(e.jam_mulai, 'HH24:MI'), to_char(e.jam_selesai, 'HH24:MI'),
	       e.status::text, e.pendaftaran_buka_at, e.pendaftaran_tutup_at,
	       ((e.tanggal + e.jam_mulai) AT TIME ZONE 'Asia/Jakarta'),
	       kec.nama_instansi, j.nama_jalan, r.nama_ruas, p.nomor,
	       p.kategori::text, p.kuota_dipakai::text, p.status::text, p.acak_at,
	       p.check_in_at, p.check_out_at, p.pedagang_id
	FROM event_participants p
	JOIN events e       ON e.id = p.event_id AND e.deleted_at IS NULL
	JOIN event_lapak el ON el.id = p.event_lapak_id
	JOIN master_ruas r  ON r.id = el.ruas_id
	JOIN master_jalan j ON j.id = r.jalan_id
	LEFT JOIN LATERAL (
		SELECT mi.nama_instansi
		FROM jalan_instansi ji
		JOIN master_instansi mi ON mi.id = ji.instansi_id AND mi.deleted_at IS NULL
		WHERE ji.jalan_id = j.id
		LIMIT 1
	) kec ON true
`

func scanKeikutsertaan(row pgx.Row) (*entity.Keikutsertaan, error) {
	var k entity.Keikutsertaan
	err := row.Scan(&k.ID, &k.EventID, &k.NamaEvent, &k.Tanggal, &k.JamMulai, &k.JamSelesai,
		&k.StatusEvent, &k.PendaftaranBukaAt, &k.PendaftaranTutupAt, &k.MulaiAt,
		&k.NamaKecamatan, &k.NamaJalan, &k.NamaRuas, &k.Nomor,
		&k.Kategori, &k.KuotaDipakai, &k.Status, &k.AcakAt,
		&k.CheckInAt, &k.CheckOutAt, &k.QRCode)
	if err != nil {
		return nil, err
	}
	return &k, nil
}

func (r *EventRepository) GetKeikutsertaan(ctx context.Context, pesertaID string) (*entity.Keikutsertaan, error) {
	k, err := scanKeikutsertaan(r.db.QueryRow(ctx, selectKeikutsertaan+`
		WHERE p.id = $1 AND p.deleted_at IS NULL`, pesertaID))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrKeikutsertaanNotFound
	}
	return k, err
}

// ListSaya: event hari ini dan ke depan yang diikuti pedagang, plus event
// lama yang check-in-nya masih terbuka (belum checkout).
func (r *EventRepository) ListSaya(ctx context.Context, pedagangID string) ([]entity.Keikutsertaan, error) {
	rows, err := r.db.Query(ctx, selectKeikutsertaan+`
		WHERE p.pedagang_id = $1 AND p.deleted_at IS NULL
		  AND (e.tanggal >= (now() AT TIME ZONE 'Asia/Jakarta')::date OR p.status = 'check_in')
		ORDER BY e.tanggal, e.jam_mulai`, pedagangID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := make([]entity.Keikutsertaan, 0)
	for rows.Next() {
		k, err := scanKeikutsertaan(rows)
		if err != nil {
			return nil, err
		}
		list = append(list, *k)
	}
	return list, rows.Err()
}
