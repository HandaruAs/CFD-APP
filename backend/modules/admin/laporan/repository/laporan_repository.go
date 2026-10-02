package repository

import (
	"context"

	"cfd-backend/modules/admin/laporan/entity"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Semua query memakai tanggal WIB dan hanya mengambil akun dengan role
// pedagang / petugas -- superadmin tidak ikut.
//
// Aktivitas (kehadiran, klaim, scan, omset) dibaca dari data EVENT
// (events + event_participants), bukan tabel sistem lama. Periode memakai
// TANGGAL EVENT. Pemetaan ke istilah lama di response:
//   - "kehadiran" = peserta yang sudah check-in (check_in_at terisi)
//   - "klaim"     = keikutsertaan di event (dapat lapak); "batal" = membatalkan
//   - "sesi"      = event
//   - jenis pedagang lama/baru = pedagang_profiles.kategori

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
			COUNT(*) FILTER (WHERE p.id IS NOT NULL AND p.kategori = 'baru'),
			COUNT(*) FILTER (WHERE p.id IS NOT NULL AND p.kategori = 'lama'),
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
			COUNT(*) FILTER (WHERE ep.check_out_at IS NOT NULL),
			COUNT(*) FILTER (WHERE ep.check_out_at IS NULL),
			COUNT(DISTINCT ep.pedagang_id),
			COUNT(DISTINCT ep.event_id),
			COALESCE(SUM(ep.omset), 0)::bigint,
			COALESCE(ROUND(AVG(ep.omset)), 0)::bigint,
			COALESCE(MAX(ep.omset), 0)::bigint
		FROM event_participants ep
		JOIN events e ON e.id = ep.event_id AND e.deleted_at IS NULL
		WHERE ep.deleted_at IS NULL
		  AND ep.check_in_at IS NOT NULL
		  AND e.tanggal BETWEEN $1::date AND $2::date
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
			COUNT(*) FILTER (WHERE ep.status <> 'batal'),
			COUNT(*) FILTER (WHERE ep.status = 'batal'),
			COUNT(*) FILTER (WHERE ep.status <> 'batal' AND ep.check_in_at IS NULL)
		FROM event_participants ep
		JOIN events e ON e.id = ep.event_id AND e.deleted_at IS NULL
		WHERE ep.deleted_at IS NULL
		  AND e.tanggal BETWEEN $1::date AND $2::date
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
				ELSE p.kategori::text
			END,
			to_char(tanggal_wib(u.created_at), 'YYYY-MM-DD'),
			COALESCE(k.jumlah, 0),
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
				COUNT(*) FILTER (WHERE ep.status <> 'batal') AS jumlah,
				COUNT(*) FILTER (WHERE ep.check_in_at IS NOT NULL) AS hadir,
				COUNT(*) FILTER (WHERE ep.check_out_at IS NOT NULL) AS checkout,
				COALESCE(SUM(ep.omset), 0)::bigint AS omset,
				MAX(e.tanggal) FILTER (WHERE ep.check_in_at IS NOT NULL) AS terakhir
			FROM event_participants ep
			JOIN events e ON e.id = ep.event_id AND e.deleted_at IS NULL
			WHERE ep.pedagang_id = p.id AND ep.deleted_at IS NULL
			  AND e.tanggal BETWEEN $1::date AND $2::date
		) k ON true
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
				COUNT(DISTINCT ep.pedagang_id) AS unik,
				COUNT(DISTINCT ep.event_id) AS sesi,
				MAX(ep.check_in_at) AS terakhir
			FROM event_participants ep
			JOIN events e ON e.id = ep.event_id AND e.deleted_at IS NULL
			WHERE ep.check_in_by = u.id AND ep.deleted_at IS NULL
			  AND e.tanggal BETWEEN $1::date AND $2::date
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
			ep.id::text,
			e.tanggal::text,
			COALESCE(p.nama_usaha, ''),
			COALESCE(NULLIF(p.nama_lengkap, ''), u.name),
			COALESCE(p.jenis_dagangan::text, ''),
			mj.nama_jalan || ' · ' || r.nama_ruas,
			ep.nomor::text,
			to_char(ep.check_in_at AT TIME ZONE 'Asia/Jakarta', 'HH24:MI'),
			COALESCE(to_char(ep.check_out_at AT TIME ZONE 'Asia/Jakarta', 'HH24:MI'), ''),
			ep.omset,
			COALESCE(pt.name, ''),
			e.nama
		FROM event_participants ep
		JOIN events e            ON e.id = ep.event_id AND e.deleted_at IS NULL
		JOIN pedagang_profiles p ON p.id = ep.pedagang_id
		JOIN users u             ON u.id = p.user_id
		JOIN event_lapak el      ON el.id = ep.event_lapak_id
		JOIN master_ruas r       ON r.id = el.ruas_id
		JOIN master_jalan mj     ON mj.id = r.jalan_id
		LEFT JOIN users pt       ON pt.id = ep.check_in_by
		WHERE ep.deleted_at IS NULL
		  AND ep.check_in_at IS NOT NULL
		  AND e.tanggal BETWEEN $1::date AND $2::date
		ORDER BY ep.check_in_at DESC
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
			&k.NamaEvent,
		); err != nil {
			return nil, err
		}
		list = append(list, k)
	}
	return list, rows.Err()
}