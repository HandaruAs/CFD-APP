package repository

import (
	"context"

	"cfd-backend/modules/admin/laporan/entity"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Semua query memakai tanggal WIB (fungsi tanggal_wib di DB) dan hanya
// mengambil akun dengan role pedagang / petugas -- superadmin tidak ikut.

type LaporanRepository interface {
	RingkasanPedagang(ctx context.Context, mulai, selesai string) (entity.RingkasanPedagang, error)
	RingkasanPetugas(ctx context.Context, mulai, selesai string) (entity.RingkasanPetugas, error)
	RingkasanKehadiran(ctx context.Context, mulai, selesai string) (entity.RingkasanKehadiran, error)
	RingkasanKlaim(ctx context.Context, mulai, selesai string) (entity.RingkasanKlaim, error)
	ListPedagang(ctx context.Context, mulai, selesai string) ([]entity.PedagangRow, error)
	ListPetugas(ctx context.Context, mulai, selesai string) ([]entity.PetugasRow, error)
	ListKehadiran(ctx context.Context, mulai, selesai string, batas int) ([]entity.KehadiranRow, error)
}

type laporanRepository struct {
	db *pgxpool.Pool
}

func NewLaporanRepository(db *pgxpool.Pool) LaporanRepository {
	return &laporanRepository{db: db}
}

// ============================================================
// RINGKASAN
// ============================================================

func (r *laporanRepository) RingkasanPedagang(ctx context.Context, mulai, selesai string) (entity.RingkasanPedagang, error) {
	var s entity.RingkasanPedagang
	err := r.db.QueryRow(ctx, `
		SELECT
			COUNT(*),
			COUNT(*) FILTER (WHERE u.status = 'active'),
			COUNT(*) FILTER (WHERE u.status <> 'active'),
			COUNT(*) FILTER (WHERE tanggal_wib(u.created_at) BETWEEN $1::date AND $2::date),
			COUNT(*) FILTER (WHERE p.id IS NOT NULL AND p.submitted_at IS NOT NULL),
			COUNT(*) FILTER (WHERE p.id IS NOT NULL AND p.submitted_at IS NULL),
			COUNT(*) FILTER (WHERE p.id IS NULL)
		FROM users u
		JOIN user_roles ur ON ur.user_id = u.id AND ur.deleted_at IS NULL
		JOIN roles r ON r.id = ur.role_id AND r.deleted_at IS NULL AND r.slug = 'pedagang'
		LEFT JOIN pedagang_profiles p ON p.user_id = u.id AND p.deleted_at IS NULL
		WHERE u.deleted_at IS NULL
	`, mulai, selesai).Scan(
		&s.Total, &s.Aktif, &s.Nonaktif, &s.DaftarPeriode,
		&s.Baru, &s.Lama, &s.BelumIsi,
	)
	return s, err
}

func (r *laporanRepository) RingkasanPetugas(ctx context.Context, mulai, selesai string) (entity.RingkasanPetugas, error) {
	var s entity.RingkasanPetugas
	err := r.db.QueryRow(ctx, `
		SELECT
			COUNT(*),
			COUNT(*) FILTER (WHERE u.status = 'active'),
			COUNT(*) FILTER (WHERE u.status <> 'active'),
			COUNT(*) FILTER (WHERE tanggal_wib(u.created_at) BETWEEN $1::date AND $2::date)
		FROM users u
		JOIN user_roles ur ON ur.user_id = u.id AND ur.deleted_at IS NULL
		JOIN roles r ON r.id = ur.role_id AND r.deleted_at IS NULL AND r.slug = 'petugas'
		WHERE u.deleted_at IS NULL
	`, mulai, selesai).Scan(&s.Total, &s.Aktif, &s.Nonaktif, &s.DaftarPeriode)
	return s, err
}

func (r *laporanRepository) RingkasanKehadiran(ctx context.Context, mulai, selesai string) (entity.RingkasanKehadiran, error) {
	var s entity.RingkasanKehadiran
	err := r.db.QueryRow(ctx, `
		SELECT
			COUNT(*),
			COUNT(*) FILTER (WHERE check_out_at IS NOT NULL),
			COUNT(*) FILTER (WHERE check_out_at IS NULL),
			COUNT(DISTINCT pedagang_id),
			COUNT(DISTINCT session_id),
			COALESCE(SUM(omset), 0)::bigint,
			COALESCE(ROUND(AVG(omset)), 0)::bigint,
			COALESCE(MAX(omset), 0)::bigint
		FROM kehadiran_pedagang
		WHERE deleted_at IS NULL
		  AND tanggal_wib(check_in_at) BETWEEN $1::date AND $2::date
	`, mulai, selesai).Scan(
		&s.Total, &s.Checkout, &s.BelumCheckout, &s.PedagangUnik, &s.JumlahSesi,
		&s.TotalOmset, &s.RataOmset, &s.OmsetTertinggi,
	)
	return s, err
}

func (r *laporanRepository) RingkasanKlaim(ctx context.Context, mulai, selesai string) (entity.RingkasanKlaim, error) {
	var s entity.RingkasanKlaim
	err := r.db.QueryRow(ctx, `
		SELECT
			COUNT(*),
			COUNT(*) FILTER (WHERE lk.status = 'aktif'),
			COUNT(*) FILTER (WHERE lk.status = 'batal'),
			COUNT(*) FILTER (WHERE NOT EXISTS (
				SELECT 1 FROM kehadiran_pedagang k
				WHERE k.pedagang_id = lk.pedagang_id
				  AND k.session_id = lk.session_id
				  AND k.deleted_at IS NULL
			))
		FROM lapak_klaim lk
		JOIN cfd_sessions s ON s.id = lk.session_id
		WHERE s.tanggal BETWEEN $1::date AND $2::date
	`, mulai, selesai).Scan(&s.Total, &s.Aktif, &s.Batal, &s.TanpaCheckin)
	return s, err
}

// ============================================================
// DAFTAR
// ============================================================

func (r *laporanRepository) ListPedagang(ctx context.Context, mulai, selesai string) ([]entity.PedagangRow, error) {
	rows, err := r.db.Query(ctx, `
		SELECT
			u.id::text,
			COALESCE(p.nama_usaha, ''),
			COALESCE(NULLIF(p.nama_lengkap, ''), u.name),
			u.email,
			COALESCE(u.phone, ''),
			COALESCE(p.jenis_dagangan::text, ''),
			COALESCE(p.jenis_lapak::text, ''),
			u.status::text,
			CASE
				WHEN p.id IS NULL THEN 'belum_isi'
				WHEN p.submitted_at IS NOT NULL THEN 'baru'
				ELSE 'lama'
			END,
			to_char(tanggal_wib(u.created_at), 'YYYY-MM-DD'),
			COALESCE(kl.jumlah, 0),
			COALESCE(k.hadir, 0),
			COALESCE(k.checkout, 0),
			COALESCE(k.omset, 0),
			COALESCE(to_char(k.terakhir, 'YYYY-MM-DD'), '')
		FROM users u
		JOIN user_roles ur ON ur.user_id = u.id AND ur.deleted_at IS NULL
		JOIN roles r ON r.id = ur.role_id AND r.deleted_at IS NULL AND r.slug = 'pedagang'
		LEFT JOIN pedagang_profiles p ON p.user_id = u.id AND p.deleted_at IS NULL
		LEFT JOIN LATERAL (
			SELECT
				COUNT(*) AS hadir,
				COUNT(*) FILTER (WHERE check_out_at IS NOT NULL) AS checkout,
				COALESCE(SUM(omset), 0)::bigint AS omset,
				MAX(tanggal_wib(check_in_at)) AS terakhir
			FROM kehadiran_pedagang
			WHERE pedagang_id = p.id AND deleted_at IS NULL
			  AND tanggal_wib(check_in_at) BETWEEN $1::date AND $2::date
		) k ON true
		LEFT JOIN LATERAL (
			SELECT COUNT(*) AS jumlah
			FROM lapak_klaim lk
			JOIN cfd_sessions s ON s.id = lk.session_id
			WHERE lk.pedagang_id = p.id AND s.tanggal BETWEEN $1::date AND $2::date
		) kl ON true
		WHERE u.deleted_at IS NULL
		ORDER BY COALESCE(k.omset, 0) DESC, COALESCE(k.hadir, 0) DESC, u.name ASC
	`, mulai, selesai)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := make([]entity.PedagangRow, 0)
	for rows.Next() {
		var p entity.PedagangRow
		if err := rows.Scan(
			&p.UserID, &p.NamaUsaha, &p.Pemilik, &p.Email, &p.Phone,
			&p.Kategori, &p.JenisLapak, &p.StatusAkun, &p.Jenis, &p.Terdaftar,
			&p.JumlahKlaim, &p.JumlahHadir, &p.JumlahCheckout, &p.TotalOmset, &p.TerakhirHadir,
		); err != nil {
			return nil, err
		}
		list = append(list, p)
	}
	return list, rows.Err()
}

func (r *laporanRepository) ListPetugas(ctx context.Context, mulai, selesai string) ([]entity.PetugasRow, error) {
	rows, err := r.db.Query(ctx, `
		SELECT
			u.id::text,
			u.name,
			u.email,
			COALESCE(u.phone, ''),
			u.status::text,
			to_char(tanggal_wib(u.created_at), 'YYYY-MM-DD'),
			COALESCE(s.scan, 0),
			COALESCE(s.unik, 0),
			COALESCE(s.sesi, 0),
			COALESCE(to_char(s.terakhir AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI'), '')
		FROM users u
		JOIN user_roles ur ON ur.user_id = u.id AND ur.deleted_at IS NULL
		JOIN roles r ON r.id = ur.role_id AND r.deleted_at IS NULL AND r.slug = 'petugas'
		LEFT JOIN LATERAL (
			SELECT
				COUNT(*) AS scan,
				COUNT(DISTINCT pedagang_id) AS unik,
				COUNT(DISTINCT session_id) AS sesi,
				MAX(check_in_at) AS terakhir
			FROM kehadiran_pedagang
			WHERE scanned_by = u.id AND deleted_at IS NULL
			  AND tanggal_wib(check_in_at) BETWEEN $1::date AND $2::date
		) s ON true
		WHERE u.deleted_at IS NULL
		ORDER BY COALESCE(s.scan, 0) DESC, u.name ASC
	`, mulai, selesai)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := make([]entity.PetugasRow, 0)
	for rows.Next() {
		var p entity.PetugasRow
		if err := rows.Scan(
			&p.UserID, &p.Nama, &p.Email, &p.Phone, &p.StatusAkun, &p.Terdaftar,
			&p.JumlahScan, &p.PedagangUnik, &p.JumlahSesi, &p.ScanTerakhir,
		); err != nil {
			return nil, err
		}
		list = append(list, p)
	}
	return list, rows.Err()
}

func (r *laporanRepository) ListKehadiran(ctx context.Context, mulai, selesai string, batas int) ([]entity.KehadiranRow, error) {
	rows, err := r.db.Query(ctx, `
		SELECT
			k.id::text,
			to_char(tanggal_wib(k.check_in_at), 'YYYY-MM-DD'),
			COALESCE(p.nama_usaha, ''),
			COALESCE(NULLIF(p.nama_lengkap, ''), u.name),
			COALESCE(p.jenis_dagangan::text, ''),
			COALESCE(mj.nama_jalan, ''),
			COALESCE(lk.nomor_lapak, ''),
			to_char(k.check_in_at AT TIME ZONE 'Asia/Jakarta', 'HH24:MI'),
			COALESCE(to_char(k.check_out_at AT TIME ZONE 'Asia/Jakarta', 'HH24:MI'), ''),
			k.omset,
			COALESCE(pt.name, '')
		FROM kehadiran_pedagang k
		JOIN pedagang_profiles p ON p.id = k.pedagang_id
		JOIN users u ON u.id = p.user_id
		LEFT JOIN users pt ON pt.id = k.scanned_by
		LEFT JOIN LATERAL (
			SELECT jalan_id, nomor_lapak
			FROM lapak_klaim
			WHERE pedagang_id = k.pedagang_id AND session_id = k.session_id
			ORDER BY (status = 'aktif') DESC, claimed_at DESC
			LIMIT 1
		) lk ON true
		LEFT JOIN master_jalan mj ON mj.id = lk.jalan_id
		WHERE k.deleted_at IS NULL
		  AND tanggal_wib(k.check_in_at) BETWEEN $1::date AND $2::date
		ORDER BY k.check_in_at DESC
		LIMIT $3
	`, mulai, selesai, batas)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := make([]entity.KehadiranRow, 0)
	for rows.Next() {
		var k entity.KehadiranRow
		if err := rows.Scan(
			&k.ID, &k.Tanggal, &k.NamaUsaha, &k.Pemilik, &k.Kategori,
			&k.NamaJalan, &k.NomorLapak, &k.CheckIn, &k.CheckOut, &k.Omset, &k.DicatatOleh,
		); err != nil {
			return nil, err
		}
		list = append(list, k)
	}
	return list, rows.Err()
}