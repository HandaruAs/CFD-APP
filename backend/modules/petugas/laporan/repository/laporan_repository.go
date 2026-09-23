package repository

import (
	"context"
	"fmt"

	"cfd-backend/modules/petugas/laporan/entity"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type LaporanRepository interface {
	GetKehadiranByDateRange(ctx context.Context, startDate, endDate, search string, page, limit int) ([]entity.KehadiranItem, int, error)
	GetStatsKehadiran(ctx context.Context, startDate, endDate string) (*entity.StatsResponse, error)
	GetDetailKehadiran(ctx context.Context, kehadiranID string) (*entity.DetailKehadiranRaw, error)
}

type laporanRepository struct {
	db *pgxpool.Pool
}

func NewLaporanRepository(db *pgxpool.Pool) LaporanRepository {
	return &laporanRepository{db: db}
}

func (r *laporanRepository) GetKehadiranByDateRange(ctx context.Context, startDate, endDate, search string, page, limit int) ([]entity.KehadiranItem, int, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 20
	}
	offset := (page - 1) * limit

	searchFilter := ""
	args := []interface{}{startDate, endDate}
	argIdx := 3

	if search != "" {
		searchFilter = fmt.Sprintf(`AND (p.nama_usaha ILIKE '%%' || $%d || '%%' OR u.name ILIKE '%%' || $%d || '%%')`, argIdx, argIdx)
		args = append(args, search)
		argIdx++
	}

	query := fmt.Sprintf(`
		SELECT 
			k.id,
			k.pedagang_id,
			COALESCE(p.nama_usaha, '') AS nama_usaha,
			COALESCE(u.name, '') AS pemilik,
			COALESCE(
				UPPER(SUBSTRING(u.name, 1, 1)) || 
				UPPER(SUBSTRING(SPLIT_PART(u.name, ' ', 2), 1, 1)),
				UPPER(SUBSTRING(u.name, 1, 2))
			) AS inisial,
			COALESCE(p.jenis_dagangan::text, '') AS kategori,
			COALESCE(p.lokasi_lapak, p.alamat, '') AS lokasi_lapak,
			TO_CHAR(k.check_in_at, 'HH24:MI') AS waktu_checkin,
			TO_CHAR(k.check_out_at, 'HH24:MI') AS waktu_checkout,
			k.omset,
			'Scan QR' AS metode,
			CASE 
				WHEN k.check_out_at IS NOT NULL THEN 'check-out'
				WHEN k.check_in_at IS NOT NULL THEN 'check-in'
				ELSE 'belum-hadir'
			END AS status
		FROM kehadiran_pedagang k
		JOIN pedagang_profiles p ON k.pedagang_id = p.id
		JOIN users u ON p.user_id = u.id
		WHERE tanggal_wib(k.check_in_at) BETWEEN $1 AND $2
			AND k.deleted_at IS NULL
			%s
		ORDER BY k.check_in_at DESC
		LIMIT $%d OFFSET $%d
	`, searchFilter, argIdx, argIdx+1)

	args = append(args, limit, offset)

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var items []entity.KehadiranItem
	for rows.Next() {
		var item entity.KehadiranItem
		err := rows.Scan(
			&item.ID,
			&item.PedagangID,
			&item.NamaUsaha,
			&item.Pemilik,
			&item.Inisial,
			&item.Kategori,
			&item.LokasiLapak,
			&item.WaktuCheckin,
			&item.WaktuCheckout,
			&item.Omset,
			&item.Metode,
			&item.Status,
		)
		if err != nil {
			return nil, 0, err
		}
		items = append(items, item)
	}

	countQuery := fmt.Sprintf(`
		SELECT COUNT(*)
		FROM kehadiran_pedagang k
		JOIN pedagang_profiles p ON k.pedagang_id = p.id
		JOIN users u ON p.user_id = u.id
		WHERE DATE(k.check_in_at) BETWEEN $1 AND $2
			AND k.deleted_at IS NULL
			%s
	`, searchFilter)

	countArgs := []interface{}{startDate, endDate}
	if search != "" {
		countArgs = append(countArgs, search)
	}

	var total int
	err = r.db.QueryRow(ctx, countQuery, countArgs...).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	return items, total, nil
}

func (r *laporanRepository) GetStatsKehadiran(ctx context.Context, startDate, endDate string) (*entity.StatsResponse, error) {
	query := `
		SELECT 
			COALESCE((SELECT COUNT(*) FROM pedagang_profiles WHERE status_verifikasi = 'approved' AND deleted_at IS NULL), 0) AS total_terdaftar,
			COALESCE(COUNT(DISTINCT k.pedagang_id), 0) AS total_checkin,
			COALESCE(COUNT(DISTINCT CASE WHEN k.check_out_at IS NOT NULL THEN k.pedagang_id END), 0) AS total_checkout,
			COALESCE(SUM(k.omset), 0) AS total_omset,
			COALESCE(AVG(k.omset), 0) AS rata_omset,
			CASE 
				WHEN COALESCE((SELECT COUNT(*) FROM pedagang_profiles WHERE status_verifikasi = 'approved' AND deleted_at IS NULL), 0) > 0 
				THEN ROUND((COALESCE(COUNT(DISTINCT k.pedagang_id), 0)::decimal / COALESCE((SELECT COUNT(*) FROM pedagang_profiles WHERE status_verifikasi = 'approved' AND deleted_at IS NULL), 0)::decimal) * 100, 2)
				ELSE 0
			END AS persen_hadir
		FROM kehadiran_pedagang k
		WHERE tanggal_wib(k.check_in_at) BETWEEN $1 AND $2
			AND k.deleted_at IS NULL
	`

	var stats entity.StatsResponse
	err := r.db.QueryRow(ctx, query, startDate, endDate).Scan(
		&stats.TotalTerdaftar,
		&stats.TotalCheckin,
		&stats.TotalCheckout,
		&stats.TotalOmset,
		&stats.RataOmset,
		&stats.PersenHadir,
	)
	if err != nil {
		return nil, err
	}

	return &stats, nil
}

// GetDetailKehadiran ambil data lengkap 1 baris kehadiran: info check-in/out,
// lokasi lapak yang diklaim pedagang di sesi itu, data usaha, dan data
// pribadi pedagang. Return nil, nil kalau data tidak ditemukan.
func (r *laporanRepository) GetDetailKehadiran(ctx context.Context, kehadiranID string) (*entity.DetailKehadiranRaw, error) {
	var d entity.DetailKehadiranRaw
	err := r.db.QueryRow(ctx, `
		SELECT
			k.id,
			tanggal_wib(k.check_in_at)::text,
			COALESCE(s.nama_sesi, ''),
			TO_CHAR(k.check_in_at, 'HH24:MI'),
			TO_CHAR(k.check_out_at, 'HH24:MI'),
			k.omset,
			CASE
				WHEN k.check_out_at IS NOT NULL THEN 'check-out'
				WHEN k.check_in_at IS NOT NULL THEN 'check-in'
				ELSE 'belum-hadir'
			END,
			COALESCE(petugas.name, ''),
			COALESCE(mj.nama_jalan, ''),
			COALESCE((
				SELECT STRING_AGG(mi.nama_instansi, ', ' ORDER BY mi.nama_instansi)
				FROM jalan_instansi ji
				JOIN master_instansi mi ON mi.id = ji.instansi_id AND mi.deleted_at IS NULL
				WHERE ji.jalan_id = lk.jalan_id
			), ''),
			COALESCE(lk.nomor_lapak, ''),
			COALESCE(p.lokasi_lapak, ''),
			COALESCE(p.nama_usaha, ''),
			COALESCE(p.jenis_dagangan::text, ''),
			COALESCE(p.jenis_lapak::text, ''),
			COALESCE(NULLIF(p.nama_lengkap, ''), u.name, ''),
			COALESCE(p.nik, ''),
			COALESCE(u.email, ''),
			COALESCE(p.tanggal_lahir::text, ''),
			CASE WHEN p.submitted_at IS NULL THEN 'lama' ELSE 'baru' END
		FROM kehadiran_pedagang k
		JOIN pedagang_profiles p ON p.id = k.pedagang_id
		JOIN users u ON u.id = p.user_id
		LEFT JOIN cfd_sessions s ON s.id = k.session_id
		LEFT JOIN users petugas ON petugas.id = k.scanned_by
		LEFT JOIN LATERAL (
			SELECT jalan_id, nomor_lapak
			FROM lapak_klaim
			WHERE pedagang_id = k.pedagang_id
			  AND session_id = k.session_id
			  AND status = 'aktif'
			ORDER BY claimed_at DESC
			LIMIT 1
		) lk ON TRUE
		LEFT JOIN master_jalan mj ON mj.id = lk.jalan_id
		WHERE k.id = $1 AND k.deleted_at IS NULL
	`, kehadiranID).Scan(
		&d.KehadiranID, &d.Tanggal, &d.NamaSesi, &d.WaktuCheckin, &d.WaktuCheckout,
		&d.Omset, &d.Status, &d.DicatatOleh,
		&d.NamaJalan, &d.Kecamatan, &d.NomorLapak, &d.LokasiLapak,
		&d.NamaUsaha, &d.JenisDagangan, &d.JenisLapak,
		&d.NamaLengkap, &d.NIK, &d.Email, &d.TanggalLahir,
		&d.StatusPedagang,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &d, nil
}