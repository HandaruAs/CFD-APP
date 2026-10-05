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
	ErrBelumCheckIn          = errors.New("kamu belum check-in di event ini")
	ErrSudahCheckout         = errors.New("kamu sudah checkout dari event ini")
	ErrEventBelumSelesai     = errors.New("checkout baru bisa dilakukan setelah event selesai")
	ErrOmsetTidakValid       = errors.New("isi total omset dengan angka lebih dari 0")
)

// ErrBelumCheckout: masih ada event yang sudah selesai tapi belum checkout.
type ErrBelumCheckout struct{ NamaEvent string }

func (e *ErrBelumCheckout) Error() string {
	return fmt.Sprintf("selesaikan checkout (isi omset) event \"%s\" dulu", e.NamaEvent)
}

// ErrSudahPunyaEvent: pedagang masih terdaftar di event lain yang belum
// selesai. Satu pedagang hanya boleh punya SATU event aktif; event lain baru
// bisa diikuti setelah event itu selesai (atau pendaftarannya dibatalkan).
type ErrSudahPunyaEvent struct{ NamaEvent string }

func (e *ErrSudahPunyaEvent) Error() string {
	return fmt.Sprintf("kamu sudah terdaftar di event \"%s\". Event lain bisa diikuti setelah event itu selesai", e.NamaEvent)
}

// querier dipenuhi *pgxpool.Pool maupun pgx.Tx, supaya pengecekan event
// aktif bisa dipakai di luar maupun di dalam transaksi Ikut.
type querier interface {
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
}

// cariEventAktif: event yang sedang "mengunci" pedagang -- statusnya masih
// terdaftar / check_in dan event-nya BELUM selesai (belum selesai_normal /
// diakhiri_awal / dibatalkan, dan jam selesainya belum lewat). Sama dengan
// aturan eventaturan.EventSudahSelesai.
//
// Event yang sudah selesai tapi belum checkout TIDAK dihitung di sini; itu
// ditangani aturan wajib checkout (ErrBelumCheckout).
//
// nil, nil = tidak ada event aktif.
func cariEventAktif(ctx context.Context, q querier, pedagangID string) (*entity.EventAktif, error) {
	var ev entity.EventAktif
	err := q.QueryRow(ctx, `
		SELECT e.id, e.nama
		FROM event_participants p
		JOIN events e ON e.id = p.event_id AND e.deleted_at IS NULL
		WHERE p.pedagang_id = $1 AND p.deleted_at IS NULL
		  AND p.status IN ('terdaftar', 'check_in')
		  AND e.status NOT IN ('selesai_normal', 'diakhiri_awal', 'dibatalkan')
		  AND now() < (e.tanggal + e.jam_selesai) AT TIME ZONE 'Asia/Jakarta'
		ORDER BY e.tanggal, e.jam_mulai
		LIMIT 1`, pedagangID).Scan(&ev.ID, &ev.Nama)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &ev, nil
}

// EventAktif: event yang sedang diikuti pedagang dan belum selesai (nil kalau
// tidak ada). Dipakai halaman Pilih Event untuk menyembunyikan event lain.
func (r *EventRepository) EventAktif(ctx context.Context, pedagangID string) (*entity.EventAktif, error) {
	return cariEventAktif(ctx, r.db, pedagangID)
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
		       p.status::text, k.sisa_lama, k.sisa_baru
		FROM events e
		JOIN v_event_kuota k ON k.event_id = e.id
		LEFT JOIN event_participants p
		       ON p.event_id = e.id AND p.pedagang_id = $1 AND p.deleted_at IS NULL
		WHERE e.deleted_at IS NULL
		  AND e.status IN ('terjadwal', 'berlangsung', 'diperpanjang')
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
			&ev.MulaiAt, &ev.StatusSaya, &ev.SisaLama, &ev.SisaBaru); err != nil {
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
		SELECT v.event_id, kec.nama_instansi, v.nama_jalan, v.nama_ruas, v.sisa
		FROM v_event_lapak_terisi v
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
		if err := rows.Scan(&eventID, &l.NamaKecamatan, &l.NamaJalan, &l.NamaRuas, &l.Sisa); err != nil {
			return nil, err
		}
		hasil[eventID] = append(hasil[eventID], l)
	}
	return hasil, rows.Err()
}

type lapakKunci struct {
	id        string
	kapasitas int
	terpakai  map[int]bool // nomor stan yang sudah dipakai
}

func (l *lapakKunci) sisa() int { return l.kapasitas - len(l.terpakai) }

// Ikut: pedagang ikut event. Server memilih titik (ruas) dan nomor stand
// secara acak dari kuota yang masih tersisa untuk kategorinya, lalu hasilnya
// langsung dikunci. Semua di dalam satu transaksi dengan baris event_lapak
// dikunci FOR UPDATE, jadi dua pedagang yang menekan bersamaan diproses
// bergantian dan tidak bisa dapat nomor yang sama.
//
// Aturan kuota (PER EVENT):
//   - kuota pedagang lama = events.kuota_lama, kuota baru = kuota_total - kuota_lama;
//   - pedagang lama hanya memakai jatah lama;
//   - pedagang baru memakai jatah baru; setelah lepas_kuota_at, kalau jatah
//     baru sudah habis, boleh memakai sisa jatah lama.
//
// Titik dipilih acak berbobot sisa tempat fisiknya (kapasitas titik), jadi
// setiap lapak kosong punya peluang yang sama.
func (r *EventRepository) Ikut(ctx context.Context, eventID, pedagangID, kategori, userID string) (string, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return "", err
	}
	defer tx.Rollback(ctx)

	// Kunci baris pedagang ini dulu: kalau pedagang yang sama menekan "Ikut"
	// di dua event bersamaan, request kedua menunggu sampai yang pertama
	// selesai, lalu tertahan aturan "satu event aktif" di bawah.
	if _, err := tx.Exec(ctx, `SELECT 1 FROM pedagang_profiles WHERE id = $1 FOR UPDATE`, pedagangID); err != nil {
		return "", err
	}

	var status, tanggal, jamMulai, jamSelesai string
	var bukaAt, tutupAt, lepasAt *time.Time
	var mulaiAt time.Time
	var kuotaTotal, kuotaLama int
	err = tx.QueryRow(ctx, `
		SELECT status::text, tanggal::text, jam_mulai::text, jam_selesai::text,
		       pendaftaran_buka_at, pendaftaran_tutup_at, lepas_kuota_at,
		       ((tanggal + jam_mulai) AT TIME ZONE 'Asia/Jakarta'),
		       kuota_total, kuota_lama
		FROM events WHERE id = $1 AND deleted_at IS NULL
		FOR SHARE`, eventID).Scan(&status, &tanggal, &jamMulai, &jamSelesai, &bukaAt, &tutupAt, &lepasAt, &mulaiAt,
		&kuotaTotal, &kuotaLama)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", ErrEventTidakDitemukan
	}
	if err != nil {
		return "", err
	}

	now := time.Now()
	switch eventaturan.StatusPendaftaran(status, bukaAt, tutupAt, eventaturan.SelesaiAt(tanggal, jamSelesai), now) {
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

	// Aturan: belum checkout di event yang sudah selesai -> wajib checkout dulu.
	var namaBelumCheckout string
	err = tx.QueryRow(ctx, `
		SELECT e2.nama
		FROM event_participants p
		JOIN events e2 ON e2.id = p.event_id
		WHERE p.pedagang_id = $1 AND p.deleted_at IS NULL AND p.status = 'check_in'
		  AND (e2.status IN ('selesai_normal', 'diakhiri_awal', 'dibatalkan')
		       OR now() >= (e2.tanggal + e2.jam_selesai) AT TIME ZONE 'Asia/Jakarta')
		ORDER BY e2.tanggal, e2.jam_mulai
		LIMIT 1`, pedagangID).Scan(&namaBelumCheckout)
	if err == nil {
		return "", &ErrBelumCheckout{NamaEvent: namaBelumCheckout}
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return "", err
	}

	// Aturan: satu pedagang hanya boleh punya SATU event aktif. Selama masih
	// terdaftar / check-in di event yang belum selesai, tidak bisa ikut event
	// lain. (Aturan ini juga mencakup jadwal yang bentrok.)
	aktif, err := cariEventAktif(ctx, tx, pedagangID)
	if err != nil {
		return "", err
	}
	if aktif != nil {
		return "", &ErrSudahPunyaEvent{NamaEvent: aktif.Nama}
	}

	// Kunci semua titik event ini: dua pedagang yang menekan bersamaan
	// diproses bergantian, jadi hitungan kuota & nomor selalu benar.
	rows, err := tx.Query(ctx, `
		SELECT id, kapasitas FROM event_lapak
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
		if err := rows.Scan(&l.id, &l.kapasitas); err != nil {
			rows.Close()
			return "", err
		}
		lapak = append(lapak, l)
		byID[l.id] = l
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return "", err
	}

	// Pemakaian kuota per jatah (lama/baru) di tingkat EVENT, dan nomor yang
	// sudah dipakai per titik.
	terisi := map[string]int{}
	nomorDipakai := map[int]bool{} // nomor stan yang sudah dipakai di event ini (semua titik)
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
		terisi[pool]++
		nomorDipakai[nomor] = true
		if l, ok := byID[lapakID]; ok {
			l.terpakai[nomor] = true
		}
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return "", err
	}

	// Jatah mana yang boleh dipakai:
	//   - pedagang lama: jatah lama;
	//   - pedagang baru: jatah baru; setelah lepas_kuota_at, kalau jatah baru
	//     habis boleh memakai sisa jatah lama.
	sisaJatah := map[string]int{
		eventaturan.KategoriLama: kuotaLama - terisi[eventaturan.KategoriLama],
		eventaturan.KategoriBaru: (kuotaTotal - kuotaLama) - terisi[eventaturan.KategoriBaru],
	}
	pools := []string{eventaturan.KategoriLama}
	if kategori == eventaturan.KategoriBaru {
		pools = []string{eventaturan.KategoriBaru}
		if eventaturan.KuotaLamaDilepas(lepasAt, now) {
			pools = append(pools, eventaturan.KategoriLama)
		}
	}
	poolDipakai := ""
	for _, pool := range pools {
		if sisaJatah[pool] > 0 {
			poolDipakai = pool
			break
		}
	}
	if poolDipakai == "" {
		return "", ErrKuotaPenuh
	}

	// Pilih titik secara acak, berbobot sisa tempat fisik: setiap lapak
	// kosong punya peluang yang sama.
	ukuranKumpulan := 0
	for _, l := range lapak {
		if l.sisa() > 0 {
			ukuranKumpulan += l.sisa()
		}
	}
	if ukuranKumpulan == 0 {
		return "", ErrKuotaPenuh
	}
	n, err := eventaturan.RandIntn(ukuranKumpulan)
	if err != nil {
		return "", err
	}
	var pilih *lapakKunci
	for _, l := range lapak {
		if l.sisa() <= 0 {
			continue
		}
		if n < l.sisa() {
			pilih = l
			break
		}
		n -= l.sisa()
	}

	// Nomor stan 6 digit acak (tampil sebagai "CFD-012361"), tidak boleh
	// kembar di event ini. Ruangnya 999.999 angka, jadi cukup diundi ulang
	// kalau kebetulan sudah dipakai.
	nomor := 0
	for percobaan := 0; percobaan < 50; percobaan++ {
		n, err := eventaturan.RandIntn(eventaturan.NomorStanMaks)
		if err != nil {
			return "", err
		}
		if !nomorDipakai[n+1] {
			nomor = n + 1
			break
		}
	}
	if nomor == 0 {
		return "", errors.New("gagal membuat nomor stan unik, coba lagi")
	}

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
			"pedagangId":     pedagangID,
			"kategori":       kategori,
			"kuotaDipakai":   poolDipakai,
			"ukuranKumpulan": ukuranKumpulan,
			"eventLapakId":   pilih.id,
			"nomor":          nomor,
			"kodeStan":       eventaturan.KodeStan(nomor),
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
	var selesaiAt time.Time
	err = tx.QueryRow(ctx, `
		SELECT p.id, p.status::text, p.nomor, p.event_lapak_id,
		       e.status::text, e.pendaftaran_buka_at, e.pendaftaran_tutup_at,
		       ((e.tanggal + e.jam_selesai) AT TIME ZONE 'Asia/Jakarta')
		FROM event_participants p
		JOIN events e ON e.id = p.event_id AND e.deleted_at IS NULL
		WHERE p.event_id = $1 AND p.pedagang_id = $2 AND p.deleted_at IS NULL
		FOR UPDATE OF p`, eventID, pedagangID).Scan(
		&pesertaID, &statusPeserta, &nomor, &eventLapakID, &statusEvent, &bukaAt, &tutupAt, &selesaiAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrBelumIkut
	}
	if err != nil {
		return err
	}
	if statusPeserta != eventaturan.PesertaTerdaftar ||
		eventaturan.StatusPendaftaran(statusEvent, bukaAt, tutupAt, selesaiAt, time.Now()) != eventaturan.PendaftaranDibuka {
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
	       p.check_in_at, p.check_out_at, p.id
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
	k.KodeStan = eventaturan.KodeStan(k.Nomor)
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

// ============================================================
// CHECKOUT PER EVENT
// ============================================================

const selectCheckout = `
	SELECT p.id, e.id, e.nama, e.tanggal::text,
	       to_char(e.jam_mulai, 'HH24:MI'), to_char(e.jam_selesai, 'HH24:MI'), e.status::text,
	       kec.nama_instansi, j.nama_jalan, r.nama_ruas, p.nomor,
	       COALESCE(pp.nik, ''), COALESCE(pp.nama_lengkap, ''), COALESCE(pp.tanggal_lahir::text, ''),
	       COALESCE(pp.nama_usaha, ''), COALESCE(pp.jenis_dagangan::text, ''), COALESCE(pp.jenis_lapak::text, ''),
	       p.status::text, p.check_in_at, p.check_out_at, p.omset,
	       ((e.tanggal + e.jam_selesai) AT TIME ZONE 'Asia/Jakarta')
	FROM event_participants p
	JOIN pedagang_profiles pp ON pp.id = p.pedagang_id
	JOIN events e       ON e.id = p.event_id
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

func scanCheckout(row pgx.Row) (*entity.DataCheckout, error) {
	var d entity.DataCheckout
	err := row.Scan(&d.PesertaID, &d.EventID, &d.NamaEvent, &d.Tanggal, &d.JamMulai, &d.JamSelesai, &d.StatusEvent,
		&d.NamaKecamatan, &d.NamaJalan, &d.NamaRuas, &d.Nomor,
		&d.NIK, &d.NamaLengkap, &d.TanggalLahir, &d.NamaUsaha, &d.KategoriUsaha, &d.JenisLapak,
		&d.Status, &d.CheckInAt, &d.CheckOutAt, &d.Omset, &d.JamSelesaiSesi)
	if err != nil {
		return nil, err
	}
	d.KodeStan = eventaturan.KodeStan(d.Nomor)
	return &d, nil
}

// ListKandidatCheckout: semua check-in yang belum ditutup, ditambah
// checkout yang dilakukan hari ini (WIB). Usecase yang memilih satu.
func (r *EventRepository) ListKandidatCheckout(ctx context.Context, pedagangID string) ([]entity.DataCheckout, error) {
	rows, err := r.db.Query(ctx, selectCheckout+`
		WHERE p.pedagang_id = $1 AND p.deleted_at IS NULL
		  AND (p.status = 'check_in'
		       OR (p.status = 'check_out'
		           AND (p.check_out_at AT TIME ZONE 'Asia/Jakarta')::date = (now() AT TIME ZONE 'Asia/Jakarta')::date))
		ORDER BY e.tanggal, e.jam_mulai, p.check_out_at DESC NULLS FIRST`, pedagangID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	list := make([]entity.DataCheckout, 0)
	for rows.Next() {
		d, err := scanCheckout(rows)
		if err != nil {
			return nil, err
		}
		list = append(list, *d)
	}
	return list, rows.Err()
}

// Checkout: pedagang menutup kehadirannya di satu event dengan mengisi
// omset. Hanya boleh setelah event itu selesai.
func (r *EventRepository) Checkout(ctx context.Context, eventID, pedagangID string, omset int64, userID string, now time.Time) (string, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return "", err
	}
	defer tx.Rollback(ctx)

	var pesertaID, statusPeserta, statusEvent string
	var selesaiAt time.Time
	err = tx.QueryRow(ctx, `
		SELECT p.id, p.status::text, e.status::text,
		       ((e.tanggal + e.jam_selesai) AT TIME ZONE 'Asia/Jakarta')
		FROM event_participants p
		JOIN events e ON e.id = p.event_id
		WHERE p.event_id = $1 AND p.pedagang_id = $2 AND p.deleted_at IS NULL
		FOR UPDATE OF p`, eventID, pedagangID).Scan(&pesertaID, &statusPeserta, &statusEvent, &selesaiAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", ErrBelumIkut
	}
	if err != nil {
		return "", err
	}
	switch statusPeserta {
	case eventaturan.PesertaCheckOut:
		return "", ErrSudahCheckout
	case eventaturan.PesertaCheckIn:
	default:
		return "", ErrBelumCheckIn
	}
	if !eventaturan.EventSudahSelesai(statusEvent, selesaiAt, now) {
		return "", ErrEventBelumSelesai
	}

	if _, err := tx.Exec(ctx, `
		UPDATE event_participants
		SET status = 'check_out', check_out_at = now(), omset = $2, auto_checkout = false, updated_at = now()
		WHERE id = $1`, pesertaID, omset); err != nil {
		return "", err
	}
	if err := eventaturan.Audit(ctx, tx, &userID, "peserta.checkout", "event_participants", &pesertaID, &eventID,
		map[string]string{"status": statusPeserta},
		map[string]any{"status": eventaturan.PesertaCheckOut, "omset": omset}, nil); err != nil {
		return "", err
	}
	return pesertaID, tx.Commit(ctx)
}