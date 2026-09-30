package repository

import (
	"context"
	"errors"
	"math"

	"cfd-backend/modules/admin/event/entity"
	"cfd-backend/modules/shared/eventaturan"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrEventTidakDitemukan   = errors.New("event tidak ditemukan")
	ErrLapakTidakDitemukan   = errors.New("titik lokasi tidak ditemukan di event ini")
	ErrStatusTidakSesuai     = errors.New("status event tidak memungkinkan aksi ini")
	ErrScopeTidakValid       = errors.New("cakupan tidak valid")
	ErrWilayahWajibDiisi     = errors.New("pilih minimal satu wilayah untuk cakupan ini")
	ErrWilayahTidakDitemukan = errors.New("sebagian wilayah yang dipilih tidak ditemukan atau sudah dihapus")
	ErrTidakAdaKandidat      = errors.New("tidak ada ruas yang bisa dipakai di cakupan ini (semua sudah dipakai event ini atau event lain yang jamnya bentrok, atau kuota ruasnya 0)")
)

type EventRepository struct {
	db *pgxpool.Pool
}

func NewEventRepository(db *pgxpool.Pool) *EventRepository {
	return &EventRepository{db: db}
}

// ============================================================
// EVENT
// ============================================================

// Kolom event + ringkasan kuota dari view v_event_lapak_kuota.
const selectEvent = `
	SELECT e.id, e.nama, e.tanggal::text,
	       to_char(e.jam_mulai, 'HH24:MI'), to_char(e.jam_selesai, 'HH24:MI'),
	       e.status::text, e.pendaftaran_buka_at, e.pendaftaran_tutup_at, e.lepas_kuota_at,
	       e.jam_mulai_aktual, e.jam_selesai_aktual, e.keterangan, e.created_at,
	       ((e.tanggal + e.jam_mulai) AT TIME ZONE 'Asia/Jakarta') AS mulai_at,
	       COALESCE(k.jumlah_titik, 0), COALESCE(k.kuota_lama, 0), COALESCE(k.kuota_baru, 0),
	       COALESCE(k.terisi_lama, 0), COALESCE(k.terisi_baru, 0)
	FROM events e
	LEFT JOIN LATERAL (
		SELECT COUNT(*)::int                 AS jumlah_titik,
		       SUM(v.kuota_lama)::int        AS kuota_lama,
		       SUM(v.kuota_baru)::int        AS kuota_baru,
		       SUM(v.terisi_lama)::int       AS terisi_lama,
		       SUM(v.terisi_baru)::int       AS terisi_baru
		FROM v_event_lapak_kuota v
		WHERE v.event_id = e.id
	) k ON true
`

func scanEvent(row pgx.Row) (*entity.Event, error) {
	var ev entity.Event
	err := row.Scan(
		&ev.ID, &ev.Nama, &ev.Tanggal, &ev.JamMulai, &ev.JamSelesai,
		&ev.Status, &ev.PendaftaranBukaAt, &ev.PendaftaranTutupAt, &ev.LepasKuotaAt,
		&ev.JamMulaiAktual, &ev.JamSelesaiAktual, &ev.Keterangan, &ev.CreatedAt,
		&ev.MulaiAt,
		&ev.JumlahTitik, &ev.KuotaLama, &ev.KuotaBaru, &ev.TerisiLama, &ev.TerisiBaru,
	)
	if err != nil {
		return nil, err
	}
	return &ev, nil
}

// ListEvents: tanggal nil = semua event (terbaru dulu).
func (r *EventRepository) ListEvents(ctx context.Context, tanggal *string) ([]entity.Event, error) {
	rows, err := r.db.Query(ctx, selectEvent+`
		WHERE e.deleted_at IS NULL
		  AND ($1::date IS NULL OR e.tanggal = $1::date)
		ORDER BY e.tanggal DESC, e.jam_mulai ASC, e.created_at ASC`, tanggal)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := make([]entity.Event, 0)
	for rows.Next() {
		ev, err := scanEvent(rows)
		if err != nil {
			return nil, err
		}
		list = append(list, *ev)
	}
	return list, rows.Err()
}

func (r *EventRepository) GetEvent(ctx context.Context, id string) (*entity.Event, error) {
	ev, err := scanEvent(r.db.QueryRow(ctx, selectEvent+`
		WHERE e.id = $1 AND e.deleted_at IS NULL`, id))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrEventTidakDitemukan
	}
	return ev, err
}

func (r *EventRepository) CreateEvent(ctx context.Context, in *entity.EventInput, actorID string) (string, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return "", err
	}
	defer tx.Rollback(ctx)

	var id string
	err = tx.QueryRow(ctx, `
		INSERT INTO events (nama, tanggal, jam_mulai, jam_selesai,
		                    pendaftaran_buka_at, pendaftaran_tutup_at, lepas_kuota_at,
		                    keterangan, status, created_by)
		VALUES ($1, $2::date, $3::time, $4::time, $5, $6, $7, $8, 'draft', $9)
		RETURNING id`,
		in.Nama, in.Tanggal, in.JamMulai, in.JamSelesai,
		in.PendaftaranBukaAt, in.PendaftaranTutupAt, in.LepasKuotaAt,
		in.Keterangan, actorID,
	).Scan(&id)
	if err != nil {
		return "", err
	}
	if err := eventaturan.Audit(ctx, tx, &actorID, "event.create", "events", &id, &id, nil, in, nil); err != nil {
		return "", err
	}
	return id, tx.Commit(ctx)
}

// UpdateEvent hanya untuk event draft/terjadwal (dicek ulang di WHERE supaya
// aman dari race dengan scheduler).
func (r *EventRepository) UpdateEvent(ctx context.Context, id string, in *entity.EventInput, sebelum *entity.Event, actorID string) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	tag, err := tx.Exec(ctx, `
		UPDATE events SET
			nama = $2, tanggal = $3::date, jam_mulai = $4::time, jam_selesai = $5::time,
			pendaftaran_buka_at = $6, pendaftaran_tutup_at = $7, lepas_kuota_at = $8,
			keterangan = $9, updated_at = now()
		WHERE id = $1 AND deleted_at IS NULL AND status IN ('draft', 'terjadwal')`,
		id, in.Nama, in.Tanggal, in.JamMulai, in.JamSelesai,
		in.PendaftaranBukaAt, in.PendaftaranTutupAt, in.LepasKuotaAt, in.Keterangan,
	)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrStatusTidakSesuai
	}
	if err := eventaturan.Audit(ctx, tx, &actorID, "event.update", "events", &id, &id, sebelum, in, nil); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

// SetStatus mengubah status event kalau status saat ini termasuk `dari`.
// jamSelesaiBaru diisi hanya untuk aksi perpanjang.
func (r *EventRepository) SetStatus(ctx context.Context, id string, dari []string, ke string, jamSelesaiBaru *string, actorID string, alasan *string) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	var statusLama string
	err = tx.QueryRow(ctx, `
		SELECT status::text FROM events
		WHERE id = $1 AND deleted_at IS NULL
		FOR UPDATE`, id).Scan(&statusLama)
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrEventTidakDitemukan
	}
	if err != nil {
		return err
	}
	boleh := false
	for _, s := range dari {
		if s == statusLama {
			boleh = true
			break
		}
	}
	if !boleh {
		return ErrStatusTidakSesuai
	}

	_, err = tx.Exec(ctx, `
		UPDATE events SET
			status = $2::event_status,
			jam_selesai = COALESCE($3::time, jam_selesai),
			jam_mulai_aktual = CASE WHEN $2 = 'berlangsung' THEN COALESCE(jam_mulai_aktual, now()) ELSE jam_mulai_aktual END,
			jam_selesai_aktual = CASE WHEN $2 IN ('diakhiri_awal', 'selesai_normal') THEN now() ELSE jam_selesai_aktual END,
			dibuka_oleh = CASE WHEN $2 = 'berlangsung' THEN $4::uuid ELSE dibuka_oleh END,
			ditutup_oleh = CASE WHEN $2 IN ('diakhiri_awal', 'dibatalkan') THEN $4::uuid ELSE ditutup_oleh END,
			updated_at = now()
		WHERE id = $1`,
		id, ke, jamSelesaiBaru, actorID,
	)
	if err != nil {
		return err
	}

	// Event dibatalkan: semua pendaftaran yang belum hadir ikut batal.
	if ke == eventaturan.StatusDibatalkan {
		if _, err := tx.Exec(ctx, `
			UPDATE event_participants SET status = 'batal', batal_at = now(), updated_at = now()
			WHERE event_id = $1 AND status = 'terdaftar' AND deleted_at IS NULL`, id); err != nil {
			return err
		}
	}

	sesudah := map[string]any{"status": ke}
	if jamSelesaiBaru != nil {
		sesudah["jamSelesai"] = *jamSelesaiBaru
	}
	if err := eventaturan.Audit(ctx, tx, &actorID, "event.status", "events", &id, &id,
		map[string]any{"status": statusLama}, sesudah, alasan); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

// DeleteEvent: soft delete event beserta titik lokasinya.
func (r *EventRepository) DeleteEvent(ctx context.Context, id string, actorID string) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	tag, err := tx.Exec(ctx, `
		UPDATE events SET deleted_at = now(), updated_at = now()
		WHERE id = $1 AND deleted_at IS NULL AND status IN ('draft', 'terjadwal', 'dibatalkan')`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrStatusTidakSesuai
	}
	if _, err := tx.Exec(ctx, `
		UPDATE event_lapak SET deleted_at = now(), updated_at = now()
		WHERE event_id = $1 AND deleted_at IS NULL`, id); err != nil {
		return err
	}
	if err := eventaturan.Audit(ctx, tx, &actorID, "event.delete", "events", &id, &id, nil, nil, nil); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

// CountPesertaAktif: peserta yang tidak batal.
func (r *EventRepository) CountPesertaAktif(ctx context.Context, eventID string) (int, error) {
	var n int
	err := r.db.QueryRow(ctx, `
		SELECT COUNT(*)::int FROM event_participants
		WHERE event_id = $1 AND status <> 'batal' AND deleted_at IS NULL`, eventID).Scan(&n)
	return n, err
}

// ============================================================
// TITIK LOKASI (event_lapak)
// ============================================================

const selectLapak = `
	SELECT v.event_lapak_id, v.ruas_id, v.nama_ruas, v.jalan_id, v.nama_jalan,
	       kec.id, kec.nama_instansi,
	       v.kuota_lama, v.kuota_baru,
	       v.terisi_lama::int, v.terisi_baru::int, v.sisa_lama::int, v.sisa_baru::int,
	       COALESCE((SELECT MAX(p.nomor) FROM event_participants p
	                 WHERE p.event_lapak_id = v.event_lapak_id
	                   AND p.status <> 'batal' AND p.deleted_at IS NULL), 0)
	FROM v_event_lapak_kuota v
	JOIN master_ruas r ON r.id = v.ruas_id
	LEFT JOIN LATERAL (
		SELECT mi.id, mi.nama_instansi
		FROM jalan_instansi ji
		JOIN master_instansi mi ON mi.id = ji.instansi_id AND mi.deleted_at IS NULL
		WHERE ji.jalan_id = v.jalan_id
		LIMIT 1
	) kec ON true
`

func scanLapak(row pgx.Row) (*entity.EventLapak, error) {
	var l entity.EventLapak
	err := row.Scan(
		&l.ID, &l.RuasID, &l.NamaRuas, &l.JalanID, &l.NamaJalan,
		&l.KecamatanID, &l.NamaKecamatan,
		&l.KuotaLama, &l.KuotaBaru,
		&l.TerisiLama, &l.TerisiBaru, &l.SisaLama, &l.SisaBaru,
		&l.NomorTerbesar,
	)
	if err != nil {
		return nil, err
	}
	return &l, nil
}

func (r *EventRepository) ListLapak(ctx context.Context, eventID string) ([]entity.EventLapak, error) {
	rows, err := r.db.Query(ctx, selectLapak+`
		WHERE v.event_id = $1
		ORDER BY kec.nama_instansi NULLS LAST, v.nama_jalan, r.urutan`, eventID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := make([]entity.EventLapak, 0)
	for rows.Next() {
		l, err := scanLapak(rows)
		if err != nil {
			return nil, err
		}
		list = append(list, *l)
	}
	return list, rows.Err()
}

func (r *EventRepository) GetLapak(ctx context.Context, eventID, lapakID string) (*entity.EventLapak, error) {
	l, err := scanLapak(r.db.QueryRow(ctx, selectLapak+`
		WHERE v.event_id = $1 AND v.event_lapak_id = $2`, eventID, lapakID))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrLapakTidakDitemukan
	}
	return l, err
}

type kandidatRuas struct {
	ruasID string
	kuota  int
}

// AcakLokasi memilih ruas secara acak (crypto/rand) di dalam cakupan lalu
// menambahkannya sebagai titik lokasi event. Ruas yang dilewati:
//   - sudah jadi titik di event ini,
//   - dipakai event lain di tanggal yang sama dengan jam yang bentrok,
//   - kuotanya 0 di master jalan.
//
// Kuota tiap ruas diambil dari master (JSONB master_jalan.ruas) lalu dibagi
// ke kuota lama/baru sesuai persenLama. jumlahTitik 0 = ambil semua kandidat.
func (r *EventRepository) AcakLokasi(ctx context.Context, eventID string, req *entity.AcakLokasiRequest, persenLama int, actorID string) (int, []entity.EventLapak, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return 0, nil, err
	}
	defer tx.Rollback(ctx)

	// Kunci baris event: dua admin menekan acak bersamaan tidak saling
	// menimpa, dan status dicek ulang di dalam transaksi.
	var status, tanggal, jamMulai, jamSelesai string
	err = tx.QueryRow(ctx, `
		SELECT status::text, tanggal::text, jam_mulai::text, jam_selesai::text
		FROM events WHERE id = $1 AND deleted_at IS NULL
		FOR UPDATE`, eventID).Scan(&status, &tanggal, &jamMulai, &jamSelesai)
	if errors.Is(err, pgx.ErrNoRows) {
		return 0, nil, ErrEventTidakDitemukan
	}
	if err != nil {
		return 0, nil, err
	}
	if status != eventaturan.StatusDraft && status != eventaturan.StatusTerjadwal {
		return 0, nil, ErrStatusTidakSesuai
	}

	var filter, cekAda string
	args := []any{eventID, tanggal, jamMulai, jamSelesai}
	switch req.Scope {
	case entity.ScopeKota:
		filter = ""
	case entity.ScopeKecamatan:
		filter = ` AND EXISTS (SELECT 1 FROM jalan_instansi ji
		                       WHERE ji.jalan_id = j.id AND ji.instansi_id = ANY($5::uuid[]))`
		cekAda = `SELECT COUNT(*)::int FROM master_instansi WHERE id = ANY($1::uuid[]) AND deleted_at IS NULL`
	case entity.ScopeJalan:
		filter = ` AND j.id = ANY($5::uuid[])`
		cekAda = `SELECT COUNT(*)::int FROM master_jalan WHERE id = ANY($1::uuid[]) AND deleted_at IS NULL`
	case entity.ScopeRuas:
		filter = ` AND r.id = ANY($5::uuid[])`
		cekAda = `SELECT COUNT(*)::int FROM master_ruas r
		          JOIN master_jalan j ON j.id = r.jalan_id AND j.deleted_at IS NULL
		          WHERE r.id = ANY($1::uuid[]) AND r.deleted_at IS NULL`
	default:
		return 0, nil, ErrScopeTidakValid
	}
	if req.Scope != entity.ScopeKota {
		if len(req.WilayahIDs) == 0 {
			return 0, nil, ErrWilayahWajibDiisi
		}
		var ada int
		if err := tx.QueryRow(ctx, cekAda, req.WilayahIDs).Scan(&ada); err != nil {
			return 0, nil, err
		}
		if ada != len(req.WilayahIDs) {
			return 0, nil, ErrWilayahTidakDitemukan
		}
		args = append(args, req.WilayahIDs)
	}

	rows, err := tx.Query(ctx, `
		SELECT r.id, k.kuota
		FROM master_ruas r
		JOIN master_jalan j ON j.id = r.jalan_id AND j.deleted_at IS NULL
		JOIN LATERAL (
			SELECT COALESCE((x->>'kuota')::int, 0) AS kuota
			FROM jsonb_array_elements(j.ruas) x
			WHERE x->>'id' = r.id::text
			LIMIT 1
		) k ON true
		WHERE r.deleted_at IS NULL
		  AND k.kuota > 0
		  AND NOT EXISTS (
		      SELECT 1 FROM event_lapak el
		      WHERE el.event_id = $1 AND el.ruas_id = r.id AND el.deleted_at IS NULL)
		  AND NOT EXISTS (
		      SELECT 1 FROM event_lapak el
		      JOIN events e2 ON e2.id = el.event_id
		      WHERE el.ruas_id = r.id AND el.deleted_at IS NULL
		        AND e2.id <> $1 AND e2.deleted_at IS NULL
		        AND e2.status <> 'dibatalkan'
		        AND e2.tanggal = $2::date
		        AND e2.jam_mulai < $4::time AND e2.jam_selesai > $3::time)`+filter+`
		ORDER BY r.id`, args...)
	if err != nil {
		return 0, nil, err
	}
	var kandidat []kandidatRuas
	for rows.Next() {
		var k kandidatRuas
		if err := rows.Scan(&k.ruasID, &k.kuota); err != nil {
			rows.Close()
			return 0, nil, err
		}
		kandidat = append(kandidat, k)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return 0, nil, err
	}
	if len(kandidat) == 0 {
		return 0, nil, ErrTidakAdaKandidat
	}

	// Fisher-Yates dengan crypto/rand, lalu ambil jumlahTitik teratas.
	for i := len(kandidat) - 1; i > 0; i-- {
		j, err := eventaturan.RandIntn(i + 1)
		if err != nil {
			return 0, nil, err
		}
		kandidat[i], kandidat[j] = kandidat[j], kandidat[i]
	}
	ambil := len(kandidat)
	if req.JumlahTitik > 0 && req.JumlahTitik < ambil {
		ambil = req.JumlahTitik
	}

	ids := make([]string, 0, ambil)
	for _, k := range kandidat[:ambil] {
		kuotaLama := int(math.Round(float64(k.kuota) * float64(persenLama) / 100))
		kuotaBaru := k.kuota - kuotaLama
		var id string
		err := tx.QueryRow(ctx, `
			INSERT INTO event_lapak (event_id, ruas_id, kuota_lama, kuota_baru, created_by)
			VALUES ($1, $2, $3, $4, $5)
			RETURNING id`, eventID, k.ruasID, kuotaLama, kuotaBaru, actorID).Scan(&id)
		if err != nil {
			return 0, nil, err
		}
		ids = append(ids, id)
	}

	if err := eventaturan.Audit(ctx, tx, &actorID, "event_lapak.acak_lokasi", "event_lapak", nil, &eventID, nil,
		map[string]any{
			"scope":          req.Scope,
			"wilayahIds":     req.WilayahIDs,
			"jumlahTitik":    req.JumlahTitik,
			"jumlahKandidat": len(kandidat),
			"jumlahDiambil":  ambil,
			"persenLama":     persenLama,
			"eventLapakIds":  ids,
		}, nil); err != nil {
		return 0, nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return 0, nil, err
	}

	hasil := make([]entity.EventLapak, 0, len(ids))
	for _, id := range ids {
		l, err := r.GetLapak(ctx, eventID, id)
		if err != nil {
			return 0, nil, err
		}
		hasil = append(hasil, *l)
	}
	return len(kandidat), hasil, nil
}

func (r *EventRepository) UpdateKuota(ctx context.Context, eventID, lapakID string, kuotaLama, kuotaBaru int, sebelum *entity.EventLapak, actorID string) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	tag, err := tx.Exec(ctx, `
		UPDATE event_lapak SET kuota_lama = $3, kuota_baru = $4, updated_at = now()
		WHERE id = $2 AND event_id = $1 AND deleted_at IS NULL`,
		eventID, lapakID, kuotaLama, kuotaBaru)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrLapakTidakDitemukan
	}
	if err := eventaturan.Audit(ctx, tx, &actorID, "event_lapak.update_kuota", "event_lapak", &lapakID, &eventID,
		map[string]int{"kuotaLama": sebelum.KuotaLama, "kuotaBaru": sebelum.KuotaBaru},
		map[string]int{"kuotaLama": kuotaLama, "kuotaBaru": kuotaBaru}, nil); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func (r *EventRepository) DeleteLapak(ctx context.Context, eventID, lapakID string, sebelum *entity.EventLapak, actorID string) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	tag, err := tx.Exec(ctx, `
		UPDATE event_lapak SET deleted_at = now(), updated_at = now()
		WHERE id = $2 AND event_id = $1 AND deleted_at IS NULL
		  AND NOT EXISTS (SELECT 1 FROM event_participants p
		                  WHERE p.event_lapak_id = $2 AND p.status <> 'batal' AND p.deleted_at IS NULL)`,
		eventID, lapakID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrLapakTidakDitemukan
	}
	if err := eventaturan.Audit(ctx, tx, &actorID, "event_lapak.delete", "event_lapak", &lapakID, &eventID, sebelum, nil, nil); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

// ============================================================
// PESERTA
// ============================================================

func (r *EventRepository) ListPeserta(ctx context.Context, eventID string) ([]entity.Peserta, error) {
	rows, err := r.db.Query(ctx, `
		SELECT p.id, p.pedagang_id, pp.nama_lengkap, pp.nama_usaha,
		       p.kategori::text, p.kuota_dipakai::text, p.status::text,
		       j.nama_jalan, r.nama_ruas, p.nomor, p.acak_at,
		       p.check_in_at, p.check_out_at, p.auto_checkout
		FROM event_participants p
		JOIN pedagang_profiles pp ON pp.id = p.pedagang_id
		JOIN event_lapak el ON el.id = p.event_lapak_id
		JOIN master_ruas r ON r.id = el.ruas_id
		JOIN master_jalan j ON j.id = r.jalan_id
		WHERE p.event_id = $1 AND p.deleted_at IS NULL
		ORDER BY j.nama_jalan, r.urutan, p.nomor`, eventID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := make([]entity.Peserta, 0)
	for rows.Next() {
		var p entity.Peserta
		if err := rows.Scan(&p.ID, &p.PedagangID, &p.NamaLengkap, &p.NamaUsaha,
			&p.Kategori, &p.KuotaDipakai, &p.Status,
			&p.NamaJalan, &p.NamaRuas, &p.Nomor, &p.AcakAt,
			&p.CheckInAt, &p.CheckOutAt, &p.AutoCheckout); err != nil {
			return nil, err
		}
		list = append(list, p)
	}
	return list, rows.Err()
}

// ============================================================
// LABEL
// ============================================================

// NamaWilayah: nama-nama wilayah yang dipilih, buat label hasil acak.
func (r *EventRepository) NamaWilayah(ctx context.Context, scope string, ids []string) ([]string, error) {
	var q string
	switch scope {
	case entity.ScopeKecamatan:
		q = `SELECT 'Kec. ' || nama_instansi FROM master_instansi
		     WHERE id = ANY($1::uuid[]) ORDER BY nama_instansi`
	case entity.ScopeJalan:
		q = `SELECT nama_jalan FROM master_jalan
		     WHERE id = ANY($1::uuid[]) ORDER BY nama_jalan`
	case entity.ScopeRuas:
		q = `SELECT r.nama_ruas || ' (' || j.nama_jalan || ')'
		     FROM master_ruas r JOIN master_jalan j ON j.id = r.jalan_id
		     WHERE r.id = ANY($1::uuid[]) ORDER BY j.nama_jalan, r.urutan`
	default:
		return nil, nil
	}
	rows, err := r.db.Query(ctx, q, ids)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	nama := make([]string, 0, len(ids))
	for rows.Next() {
		var n string
		if err := rows.Scan(&n); err != nil {
			return nil, err
		}
		nama = append(nama, n)
	}
	return nama, rows.Err()
}

// ============================================================
// SCHEDULER
// ============================================================

// TickStatus dipanggil tiap menit:
//   - terjadwal -> berlangsung saat jam mulai tiba (per event, bukan global)
//   - terjadwal/berlangsung/diperpanjang -> selesai_normal saat jam selesai lewat
//   - peserta yang masih 'terdaftar' di event yang sudah selesai -> tidak_hadir
func (r *EventRepository) TickStatus(ctx context.Context) error {
	if _, err := r.db.Exec(ctx, `
		UPDATE events SET status = 'berlangsung',
		       jam_mulai_aktual = COALESCE(jam_mulai_aktual, now()), updated_at = now()
		WHERE deleted_at IS NULL AND status = 'terjadwal'
		  AND now() >= (tanggal + jam_mulai) AT TIME ZONE 'Asia/Jakarta'
		  AND now() <  (tanggal + jam_selesai) AT TIME ZONE 'Asia/Jakarta'`); err != nil {
		return err
	}
	if _, err := r.db.Exec(ctx, `
		UPDATE events SET status = 'selesai_normal',
		       jam_selesai_aktual = now(), updated_at = now()
		WHERE deleted_at IS NULL AND status IN ('terjadwal', 'berlangsung', 'diperpanjang')
		  AND now() >= (tanggal + jam_selesai) AT TIME ZONE 'Asia/Jakarta'`); err != nil {
		return err
	}
	_, err := r.db.Exec(ctx, `
		UPDATE event_participants p SET status = 'tidak_hadir', updated_at = now()
		FROM events e
		WHERE e.id = p.event_id AND p.deleted_at IS NULL AND p.status = 'terdaftar'
		  AND e.status IN ('selesai_normal', 'diakhiri_awal')`)
	return err
}
