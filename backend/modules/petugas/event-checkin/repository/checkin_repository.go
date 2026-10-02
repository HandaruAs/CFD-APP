package repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	"cfd-backend/modules/petugas/event-checkin/entity"
	"cfd-backend/modules/shared/eventaturan"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrPesertaTidakDitemukan = errors.New("QR tidak dikenali")
	ErrTidakBisaCheckIn      = errors.New("pedagang tidak bisa check-in")
)

// ErrMasihCheckIn: pedagang masih check-in di event lain yang belum selesai.
type ErrMasihCheckIn struct{ NamaEvent string }

func (e *ErrMasihCheckIn) Error() string {
	return fmt.Sprintf("pedagang masih tercatat check-in di event \"%s\" yang belum selesai", e.NamaEvent)
}

// ErrBelumCheckout: pedagang belum checkout (isi omset) di event yang sudah
// selesai. Aturan: wajib checkout dulu sebelum check-in lagi.
type ErrBelumCheckout struct{ NamaEvent string }

func (e *ErrBelumCheckout) Error() string {
	return fmt.Sprintf("pedagang belum checkout di event \"%s\". Minta pedagang mengisi omset di halaman Check-out dulu", e.NamaEvent)
}

// CheckInTerbuka: check-in pedagang yang belum di-checkout.
type CheckInTerbuka struct {
	PesertaID string
	EventID   string
	NamaEvent string
	Status    string
	SelesaiAt time.Time
}

const queryCheckInTerbuka = `
	SELECT p.id, e.id, e.nama, e.status::text,
	       ((e.tanggal + e.jam_selesai) AT TIME ZONE 'Asia/Jakarta')
	FROM event_participants p
	JOIN events e ON e.id = p.event_id
	WHERE p.pedagang_id = $1 AND p.id <> $2
	  AND p.status = 'check_in' AND p.deleted_at IS NULL
	ORDER BY e.tanggal, e.jam_mulai`

type queryer interface {
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
}

func ambilCheckInTerbuka(ctx context.Context, q queryer, sql, pedagangID, kecualiPesertaID string) ([]CheckInTerbuka, error) {
	rows, err := q.Query(ctx, sql, pedagangID, kecualiPesertaID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []CheckInTerbuka
	for rows.Next() {
		var t CheckInTerbuka
		if err := rows.Scan(&t.PesertaID, &t.EventID, &t.NamaEvent, &t.Status, &t.SelesaiAt); err != nil {
			return nil, err
		}
		list = append(list, t)
	}
	return list, rows.Err()
}

// PenghalangCheckIn: error kalau pedagang masih punya check-in terbuka di
// event lain -- belum checkout di event yang sudah selesai, atau masih
// check-in di event yang sedang berjalan. nil = aman.
func PenghalangCheckIn(list []CheckInTerbuka, now time.Time) error {
	for _, t := range list {
		if eventaturan.EventSudahSelesai(t.Status, t.SelesaiAt, now) {
			return &ErrBelumCheckout{NamaEvent: t.NamaEvent}
		}
	}
	for _, t := range list {
		return &ErrMasihCheckIn{NamaEvent: t.NamaEvent}
	}
	return nil
}

// CheckInTerbukaLain: dipakai saat periksa QR untuk menampilkan peringatan.
func (r *CheckInRepository) CheckInTerbukaLain(ctx context.Context, pedagangID, kecualiPesertaID string) ([]CheckInTerbuka, error) {
	return ambilCheckInTerbuka(ctx, r.db, queryCheckInTerbuka, pedagangID, kecualiPesertaID)
}

// ErrAlasan membawa alasan spesifik kenapa check-in ditolak.
type ErrAlasan struct{ Alasan string }

func (e *ErrAlasan) Error() string { return e.Alasan }
func (e *ErrAlasan) Unwrap() error { return ErrTidakBisaCheckIn }

type CheckInRepository struct {
	db *pgxpool.Pool
}

func NewCheckInRepository(db *pgxpool.Pool) *CheckInRepository {
	return &CheckInRepository{db: db}
}

const selectPeserta = `
	SELECT p.id, p.pedagang_id, pp.nama_lengkap, pp.nama_usaha,
	       pp.jenis_dagangan::text, pp.jenis_lapak::text, p.kategori::text,
	       e.id, e.nama, e.tanggal::text,
	       to_char(e.jam_mulai, 'HH24:MI'), to_char(e.jam_selesai, 'HH24:MI'), e.status::text,
	       kec.nama_instansi, j.nama_jalan, r.nama_ruas, p.nomor,
	       p.status::text, p.check_in_at,
	       ((e.tanggal + e.jam_mulai) AT TIME ZONE 'Asia/Jakarta'),
	       ((e.tanggal + e.jam_selesai) AT TIME ZONE 'Asia/Jakarta')
	FROM event_participants p
	JOIN pedagang_profiles pp ON pp.id = p.pedagang_id
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

func scanPeserta(row pgx.Row) (*entity.PesertaScan, error) {
	var p entity.PesertaScan
	err := row.Scan(&p.PesertaID, &p.PedagangID, &p.NamaLengkap, &p.NamaUsaha,
		&p.JenisDagangan, &p.JenisLapak, &p.Kategori,
		&p.EventID, &p.NamaEvent, &p.Tanggal, &p.JamMulai, &p.JamSelesai, &p.StatusEvent,
		&p.NamaKecamatan, &p.NamaJalan, &p.NamaRuas, &p.Nomor,
		&p.Status, &p.CheckInAt, &p.MulaiAt, &p.SelesaiAt)
	if err != nil {
		return nil, err
	}
	return &p, nil
}

// GetPeserta: keikutsertaan berdasarkan id (isi QR kartu event).
func (r *CheckInRepository) GetPeserta(ctx context.Context, pesertaID string) (*entity.PesertaScan, error) {
	p, err := scanPeserta(r.db.QueryRow(ctx, selectPeserta+`
		WHERE p.id = $1 AND p.deleted_at IS NULL`, pesertaID))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrPesertaTidakDitemukan
	}
	return p, err
}

// ListPesertaHariIni: keikutsertaan aktif (terdaftar/check-in) seorang
// pedagang di event hari ini (WIB). Dipakai untuk QR lama (id pedagang).
func (r *CheckInRepository) ListPesertaHariIni(ctx context.Context, pedagangID string) ([]entity.PesertaScan, error) {
	rows, err := r.db.Query(ctx, selectPeserta+`
		WHERE p.pedagang_id = $1 AND p.deleted_at IS NULL
		  AND p.status IN ('terdaftar', 'check_in')
		  AND e.status <> 'dibatalkan'
		  AND e.tanggal = (now() AT TIME ZONE 'Asia/Jakarta')::date
		ORDER BY e.jam_mulai`, pedagangID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	list := make([]entity.PesertaScan, 0)
	for rows.Next() {
		p, err := scanPeserta(rows)
		if err != nil {
			return nil, err
		}
		list = append(list, *p)
	}
	return list, rows.Err()
}

// AdaPedagang: apakah id ini id profil pedagang (QR lama).
func (r *CheckInRepository) AdaPedagang(ctx context.Context, id string) (bool, error) {
	var ada bool
	err := r.db.QueryRow(ctx, `
		SELECT EXISTS (SELECT 1 FROM pedagang_profiles WHERE id = $1 AND deleted_at IS NULL)`, id).Scan(&ada)
	return ada, err
}

// CheckIn mencatat kehadiran pedagang di satu event. Semua aturan dicek
// ulang di dalam transaksi dengan baris peserta dikunci, jadi dua petugas
// yang memindai QR yang sama bersamaan tidak membuat check-in ganda.
//
// Kalau pedagang masih punya check-in terbuka di event lain, check-in
// ditolak: belum checkout di event yang sudah selesai (wajib isi omset dulu),
// atau masih check-in di event yang sedang berjalan.
func (r *CheckInRepository) CheckIn(ctx context.Context, pesertaID, petugasID string, catatan *string, now time.Time) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	var pedagangID, eventID, statusPeserta, statusEvent string
	var checkInAt *time.Time
	var mulaiAt, selesaiAt time.Time
	err = tx.QueryRow(ctx, `
		SELECT p.pedagang_id, p.event_id, p.status::text, p.check_in_at, e.status::text,
		       ((e.tanggal + e.jam_mulai) AT TIME ZONE 'Asia/Jakarta'),
		       ((e.tanggal + e.jam_selesai) AT TIME ZONE 'Asia/Jakarta')
		FROM event_participants p
		JOIN events e ON e.id = p.event_id AND e.deleted_at IS NULL
		WHERE p.id = $1 AND p.deleted_at IS NULL
		FOR UPDATE OF p`, pesertaID).Scan(
		&pedagangID, &eventID, &statusPeserta, &checkInAt, &statusEvent, &mulaiAt, &selesaiAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrPesertaTidakDitemukan
	}
	if err != nil {
		return err
	}
	if alasan := eventaturan.AlasanPesertaTidakBisaCheckIn(statusPeserta, checkInAt); alasan != "" {
		return &ErrAlasan{Alasan: alasan}
	}
	if alasan := eventaturan.AlasanTidakBisaCheckIn(statusEvent, mulaiAt, selesaiAt, now); alasan != "" {
		return &ErrAlasan{Alasan: alasan}
	}

	// Check-in terbuka di event lain milik pedagang yang sama.
	terbuka, err := ambilCheckInTerbuka(ctx, tx, queryCheckInTerbuka+` FOR UPDATE OF p`, pedagangID, pesertaID)
	if err != nil {
		return err
	}
	if err := PenghalangCheckIn(terbuka, now); err != nil {
		return err
	}

	if _, err := tx.Exec(ctx, `
		UPDATE event_participants
		SET status = 'check_in', check_in_at = now(), check_in_by = $2, updated_at = now()
		WHERE id = $1`, pesertaID, petugasID); err != nil {
		return err
	}
	if err := eventaturan.Audit(ctx, tx, &petugasID, "peserta.check_in", "event_participants", &pesertaID, &eventID,
		map[string]string{"status": statusPeserta},
		map[string]string{"status": eventaturan.PesertaCheckIn}, catatan); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

// RiwayatHariIni: check-in yang dilakukan petugas ini hari ini (WIB).
func (r *CheckInRepository) RiwayatHariIni(ctx context.Context, petugasID string) ([]entity.RiwayatItem, error) {
	rows, err := r.db.Query(ctx, `
		SELECT p.id, pp.nama_lengkap, pp.nama_usaha, e.nama, j.nama_jalan, r.nama_ruas, p.nomor, p.check_in_at
		FROM event_participants p
		JOIN pedagang_profiles pp ON pp.id = p.pedagang_id
		JOIN events e       ON e.id = p.event_id
		JOIN event_lapak el ON el.id = p.event_lapak_id
		JOIN master_ruas r  ON r.id = el.ruas_id
		JOIN master_jalan j ON j.id = r.jalan_id
		WHERE p.check_in_by = $1 AND p.deleted_at IS NULL AND p.check_in_at IS NOT NULL
		  AND (p.check_in_at AT TIME ZONE 'Asia/Jakarta')::date = (now() AT TIME ZONE 'Asia/Jakarta')::date
		ORDER BY p.check_in_at DESC`, petugasID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	list := make([]entity.RiwayatItem, 0)
	for rows.Next() {
		var it entity.RiwayatItem
		if err := rows.Scan(&it.PesertaID, &it.NamaLengkap, &it.NamaUsaha, &it.NamaEvent,
			&it.NamaJalan, &it.NamaRuas, &it.Nomor, &it.CheckInAt); err != nil {
			return nil, err
		}
		list = append(list, it)
	}
	return list, rows.Err()
}