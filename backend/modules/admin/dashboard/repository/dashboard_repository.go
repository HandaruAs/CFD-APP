package repository

import (
	"context"
	"errors"

	"cfd-backend/modules/admin/dashboard/entity"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// SesiRow: baris cfd_sessions hari ini (mentah, status diolah di usecase).
type SesiRow struct {
	ID               string
	NamaSesi         string
	JamMulai         *string // HH:MM
	JamSelesai       *string // HH:MM
	JamSelesaiAktual *string // HH:MM
	Status           string
	IsActive         bool
}

type DashboardRepository interface {
	GetSesiHariIni(ctx context.Context) (*SesiRow, error)
	GetLapakHariIni(ctx context.Context, sesiID *string) (entity.LapakHariIni, error)
	GetHadirHariIni(ctx context.Context, sesiID string) (entity.HadirHariIni, error)
	GetTrenSesi(ctx context.Context, jumlah int) ([]entity.TrenSesi, error)
	GetTrenMinggu(ctx context.Context, jumlahMinggu int) ([]entity.TrenMinggu, error)
}

type dashboardRepository struct {
	db *pgxpool.Pool
}

func NewDashboardRepository(db *pgxpool.Pool) DashboardRepository {
	return &dashboardRepository{db: db}
}

// ============================================================
// 1. HARI INI
// ============================================================

// GetSesiHariIni: baris cfd_sessions untuk tanggal hari ini. Di DB ada
// unique index per tanggal (uq_cfd_sessions_tanggal), jadi paling banyak
// 1 baris. nil kalau belum ada sama sekali.
func (r *dashboardRepository) GetSesiHariIni(ctx context.Context) (*SesiRow, error) {
	var s SesiRow
	err := r.db.QueryRow(ctx, `
		SELECT
			id,
			nama_sesi,
			to_char(jam_mulai, 'HH24:MI'),
			to_char(jam_selesai, 'HH24:MI'),
			to_char(jam_selesai_aktual, 'HH24:MI'),
			COALESCE(status, 'aktif'),
			COALESCE(is_active, false)
		FROM cfd_sessions
		WHERE tanggal = CURRENT_DATE AND deleted_at IS NULL
		ORDER BY created_at ASC
		LIMIT 1
	`).Scan(&s.ID, &s.NamaSesi, &s.JamMulai, &s.JamSelesai, &s.JamSelesaiAktual, &s.Status, &s.IsActive)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &s, nil
}

// GetLapakHariIni: total kapasitas semua jalan aktif & total terisi di
// sesi hari ini. Rumusnya SAMA dengan modul Sisa Lapak (kapasitas =
// master_jalan.kapasitas, terisi = jalan_kapasitas_sesi.terisi) supaya
// angkanya gak beda antar halaman. sesiID nil = belum ada sesi hari ini,
// terisi otomatis 0. Persen dihitung di usecase.
func (r *dashboardRepository) GetLapakHariIni(ctx context.Context, sesiID *string) (entity.LapakHariIni, error) {
	var l entity.LapakHariIni
	err := r.db.QueryRow(ctx, `
		SELECT
			COALESCE(SUM(mj.kapasitas), 0),
			COALESCE(SUM(jks.terisi), 0)
		FROM master_jalan mj
		LEFT JOIN jalan_kapasitas_sesi jks
			ON jks.jalan_id = mj.id AND jks.session_id = $1::uuid
		WHERE mj.deleted_at IS NULL
	`, sesiID).Scan(&l.Kapasitas, &l.Terisi)
	return l, err
}

func (r *dashboardRepository) GetHadirHariIni(ctx context.Context, sesiID string) (entity.HadirHariIni, error) {
	var h entity.HadirHariIni
	err := r.db.QueryRow(ctx, `
		SELECT
			(SELECT COUNT(*) FROM lapak_klaim
			 WHERE session_id = $1 AND status = 'aktif'),
			(SELECT COUNT(*) FROM kehadiran_pedagang
			 WHERE session_id = $1 AND deleted_at IS NULL),
			(SELECT COUNT(*) FROM kehadiran_pedagang
			 WHERE session_id = $1 AND deleted_at IS NULL AND check_out_at IS NOT NULL)
	`, sesiID).Scan(&h.Klaim, &h.CheckIn, &h.CheckOut)
	return h, err
}

// ============================================================
// 2. TREN
// ============================================================

// GetTrenSesi: N sesi terakhir (s/d hari ini) yang benar-benar dipakai --
// punya jam mulai, atau ada klaim / kehadiran. Sesi auto yang kosong
// (dibuat sistem tapi gak pernah dipakai) gak ikut, biar grafik gak
// penuh titik nol. Klaim dihitung semua status: klaim yang dibatalkan
// karena pedagangnya gak datang tetap dihitung sebagai "klaim".
func (r *dashboardRepository) GetTrenSesi(ctx context.Context, jumlah int) ([]entity.TrenSesi, error) {
	rows, err := r.db.Query(ctx, `
		SELECT * FROM (
			SELECT
				cs.id,
				cs.tanggal::text,
				cs.nama_sesi,
				(SELECT COUNT(*) FROM lapak_klaim lk WHERE lk.session_id = cs.id),
				(SELECT COUNT(*) FROM kehadiran_pedagang kh
				 WHERE kh.session_id = cs.id AND kh.deleted_at IS NULL),
				(SELECT COALESCE(SUM(kh.omset), 0)::bigint FROM kehadiran_pedagang kh
				 WHERE kh.session_id = cs.id AND kh.deleted_at IS NULL)
			FROM cfd_sessions cs
			WHERE cs.deleted_at IS NULL
			  AND cs.tanggal <= CURRENT_DATE
			  AND (
				cs.jam_mulai IS NOT NULL
				OR EXISTS (SELECT 1 FROM lapak_klaim lk WHERE lk.session_id = cs.id)
				OR EXISTS (SELECT 1 FROM kehadiran_pedagang kh WHERE kh.session_id = cs.id AND kh.deleted_at IS NULL)
			  )
			ORDER BY cs.tanggal DESC
			LIMIT $1
		) t
		ORDER BY 2 ASC
	`, jumlah)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := []entity.TrenSesi{}
	for rows.Next() {
		var t entity.TrenSesi
		if err := rows.Scan(&t.SesiID, &t.Tanggal, &t.NamaSesi, &t.Klaim, &t.Hadir, &t.Omset); err != nil {
			return nil, err
		}
		result = append(result, t)
	}
	return result, rows.Err()
}

// GetTrenMinggu: jumlah pedagang terdaftar per minggu (Senin-Minggu),
// N minggu terakhir termasuk minggu ini. Minggu tanpa pendaftar tetap
// muncul dengan angka 0 (generate_series).
func (r *dashboardRepository) GetTrenMinggu(ctx context.Context, jumlahMinggu int) ([]entity.TrenMinggu, error) {
	rows, err := r.db.Query(ctx, `
		WITH minggu AS (
			SELECT generate_series(
				date_trunc('week', CURRENT_DATE::timestamp) - make_interval(weeks => $1 - 1),
				date_trunc('week', CURRENT_DATE::timestamp),
				interval '1 week'
			) AS mulai
		),
		ped AS (
			SELECT p.created_at, p.submitted_at
			FROM pedagang_profiles p
			JOIN users u ON u.id = p.user_id AND u.deleted_at IS NULL
			WHERE p.deleted_at IS NULL
		)
		SELECT
			m.mulai::date::text,
			COUNT(ped.created_at) FILTER (
				WHERE ped.created_at >= m.mulai AND ped.created_at < m.mulai + interval '1 week'
				  AND ped.submitted_at IS NOT NULL
			),
			COUNT(ped.created_at) FILTER (
				WHERE ped.created_at >= m.mulai AND ped.created_at < m.mulai + interval '1 week'
				  AND ped.submitted_at IS NULL
			),
			COUNT(ped.created_at) FILTER (WHERE ped.created_at < m.mulai + interval '1 week')
		FROM minggu m
		LEFT JOIN ped ON true
		GROUP BY m.mulai
		ORDER BY m.mulai
	`, jumlahMinggu)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := []entity.TrenMinggu{}
	for rows.Next() {
		var t entity.TrenMinggu
		if err := rows.Scan(&t.MingguMulai, &t.Baru, &t.Lama, &t.Total); err != nil {
			return nil, err
		}
		result = append(result, t)
	}
	return result, rows.Err()
}