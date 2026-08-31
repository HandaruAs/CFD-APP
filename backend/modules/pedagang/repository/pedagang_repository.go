package repository

import (
	"context"
	"database/sql"

	"cfd-backend/modules/pedagang/entity"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type PedagangRepository struct {
	db *pgxpool.Pool
}

func NewPedagangRepository(db *pgxpool.Pool) *PedagangRepository {
	return &PedagangRepository{db: db}
}

// CreatePengajuanMandiri bikin baris pedagang_profiles baru. Dipakai untuk
// dua alur: self-service (pedagang daftar sendiri) DAN admin (Tambah Pedagang),
// karena keduanya insert ke kolom yang sama persis.
func (r *PedagangRepository) CreatePengajuanMandiri(
	ctx context.Context,
	userID, nik, namaLengkap, tanggalLahir, namaUsaha, jenisDagangan, jenisLapak string,
) (string, error) {
	var id string
	err := r.db.QueryRow(ctx,
		`INSERT INTO pedagang_profiles 
		 (user_id, nik, nama_lengkap, tanggal_lahir, nama_usaha, jenis_dagangan, jenis_lapak, status_verifikasi)
		 VALUES ($1, $2, $3, $4, $5, $6::jenis_dagangan_enum, $7::jenis_lapak_enum, 'pending')
		 RETURNING id`,
		userID, nik, namaLengkap, tanggalLahir, namaUsaha, jenisDagangan, jenisLapak,
	).Scan(&id)
	if err != nil {
		return "", err
	}
	return id, nil
}

// GetStatusPendaftaran ngecek apakah pendaftaran usaha lagi dibuka petugas
// (is_open), dan kalau jam_buka_pendaftaran/jam_tutup_pendaftaran di-set,
// apakah sekarang masih dalam rentang itu. Kalau salah satu jamnya NULL,
// berarti gak ada batasan jam (cuma is_open yang dicek).
func (r *PedagangRepository) GetStatusPendaftaran(ctx context.Context) (isOpen bool, dalamJam bool, err error) {
	err = r.db.QueryRow(ctx, `
		SELECT is_open,
		       (jam_buka_pendaftaran IS NULL OR jam_tutup_pendaftaran IS NULL
		        OR CURRENT_TIME BETWEEN jam_buka_pendaftaran AND jam_tutup_pendaftaran) AS dalam_jam
		FROM pengaturan_pendaftaran
		LIMIT 1
	`).Scan(&isOpen, &dalamJam)
	if err != nil {
		return false, false, err
	}
	return isOpen, dalamJam, nil
}

// GetPengajuanByUserID dipakai buat nampilin status pengajuan
func (r *PedagangRepository) GetPengajuanByUserID(ctx context.Context, userID string) (*entity.PengajuanStatus, error) {
	var p entity.PengajuanStatus
	var namaLengkap, tanggalLahir, jenisLapak, perkiraanHarga, alamat sql.NullString

	err := r.db.QueryRow(ctx,
		`SELECT id, nik, nama_lengkap, tanggal_lahir::text, nama_usaha, jenis_dagangan,
		        jenis_lapak, perkiraan_harga, alamat, status_verifikasi, catatan
		 FROM pedagang_profiles
		 WHERE user_id = $1 AND deleted_at IS NULL`,
		userID,
	).Scan(
		&p.ID, &p.NIK, &namaLengkap, &tanggalLahir, &p.NamaUsaha, &p.JenisDagangan,
		&jenisLapak, &perkiraanHarga, &alamat, &p.StatusVerifikasi, &p.Catatan,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	p.NamaLengkap = &namaLengkap.String
	p.TanggalLahir = &tanggalLahir.String
	p.JenisLapak = &jenisLapak.String
	p.PerkiraanHarga = &perkiraanHarga.String
	p.Alamat = &alamat.String

	return &p, nil
}

// ListPedagang mengambil data pedagang beserta profilnya
func (r *PedagangRepository) ListPedagang(ctx context.Context) ([]entity.PedagangUserDTO, int, error) {
	rows, err := r.db.Query(ctx, `
		SELECT 
			u.id, u.name, u.email, u.phone, u.created_at, u.status,
			p.nik, p.nama_lengkap, p.tanggal_lahir::text, p.nama_usaha, p.jenis_dagangan,
			p.jenis_lapak, p.perkiraan_harga, p.alamat, p.status_verifikasi
		FROM users u
		JOIN user_roles ur ON ur.user_id = u.id AND ur.deleted_at IS NULL
		JOIN roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
		LEFT JOIN pedagang_profiles p ON p.user_id = u.id AND p.deleted_at IS NULL
		WHERE r.slug = 'pedagang'
		  AND u.deleted_at IS NULL
		ORDER BY u.created_at DESC
	`)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var users []entity.PedagangUserDTO
	for rows.Next() {
		var u entity.PedagangUserDTO
		var createdAt, status, nik, namaLengkap, tanggalLahir, namaUsaha, jenisDagangan, jenisLapak, perkiraanHarga, alamat, statusVerifikasi sql.NullString

		err := rows.Scan(
			&u.ID, &u.Name, &u.Email, &u.Phone,
			&createdAt, &status,
			&nik, &namaLengkap, &tanggalLahir, &namaUsaha, &jenisDagangan,
			&jenisLapak, &perkiraanHarga, &alamat, &statusVerifikasi,
		)
		if err != nil {
			return nil, 0, err
		}

		u.JoinedAt = createdAt.String
		u.Active = status.String == "active"
		u.Initial = string([]rune(u.Name)[0])
		u.NIK = &nik.String
		u.NamaLengkap = &namaLengkap.String
		u.TanggalLahir = &tanggalLahir.String
		u.NamaUsaha = &namaUsaha.String
		u.JenisDagangan = &jenisDagangan.String
		u.JenisLapak = &jenisLapak.String
		u.PerkiraanHarga = &perkiraanHarga.String
		u.Alamat = &alamat.String
		u.StatusVerifikasi = &statusVerifikasi.String

		users = append(users, u)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, err
	}

	return users, len(users), nil
}

// GetPedagangStats menghitung statistik pedagang
func (r *PedagangRepository) GetPedagangStats(ctx context.Context) (entity.PedagangStatsResponse, error) {
	var stats entity.PedagangStatsResponse

	err := r.db.QueryRow(ctx, `
		SELECT COUNT(*) 
		FROM users u
		JOIN user_roles ur ON ur.user_id = u.id AND ur.deleted_at IS NULL
		JOIN roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
		WHERE r.slug = 'pedagang' AND u.deleted_at IS NULL
	`).Scan(&stats.Total)
	if err != nil {
		return stats, err
	}

	err = r.db.QueryRow(ctx, `
		SELECT COUNT(*) 
		FROM users u
		JOIN user_roles ur ON ur.user_id = u.id AND ur.deleted_at IS NULL
		JOIN roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
		WHERE r.slug = 'pedagang' AND u.status = 'active' AND u.deleted_at IS NULL
	`).Scan(&stats.Active)
	if err != nil {
		return stats, err
	}

	err = r.db.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM pedagang_profiles p
		JOIN users u ON u.id = p.user_id AND u.deleted_at IS NULL
		JOIN user_roles ur ON ur.user_id = u.id AND ur.deleted_at IS NULL
		JOIN roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
		WHERE r.slug = 'pedagang' AND p.status_verifikasi = 'pending' AND p.deleted_at IS NULL
	`).Scan(&stats.Pending)
	if err != nil {
		return stats, err
	}

	err = r.db.QueryRow(ctx, `
		SELECT COUNT(*) 
		FROM users u
		JOIN user_roles ur ON ur.user_id = u.id AND ur.deleted_at IS NULL
		JOIN roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
		WHERE r.slug = 'pedagang' AND u.status = 'suspended' AND u.deleted_at IS NULL
	`).Scan(&stats.Suspended)
	if err != nil {
		return stats, err
	}

	return stats, nil
}

func (r *PedagangRepository) GetPedagangByID(ctx context.Context, id string) (*entity.PedagangUserDTO, error) {
	var u entity.PedagangUserDTO
	var createdAt, status, nik, namaLengkap, tanggalLahir, namaUsaha, jenisDagangan, jenisLapak, perkiraanHarga, alamat, statusVerifikasi sql.NullString

	err := r.db.QueryRow(ctx, `
		SELECT 
			u.id, u.name, u.email, u.phone, u.created_at, u.status,
			p.nik, p.nama_lengkap, p.tanggal_lahir::text, p.nama_usaha, p.jenis_dagangan,
			p.jenis_lapak, p.perkiraan_harga, p.alamat, p.status_verifikasi
		FROM users u
		JOIN user_roles ur ON ur.user_id = u.id AND ur.deleted_at IS NULL
		JOIN roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
		LEFT JOIN pedagang_profiles p ON p.user_id = u.id AND p.deleted_at IS NULL
		WHERE u.id = $1 AND u.deleted_at IS NULL
	`, id,
	).Scan(
		&u.ID, &u.Name, &u.Email, &u.Phone,
		&createdAt, &status,
		&nik, &namaLengkap, &tanggalLahir, &namaUsaha, &jenisDagangan,
		&jenisLapak, &perkiraanHarga, &alamat, &statusVerifikasi,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	u.JoinedAt = createdAt.String
	u.Active = status.String == "active"
	u.Initial = string([]rune(u.Name)[0])
	u.NIK = &nik.String
	u.NamaLengkap = &namaLengkap.String
	u.TanggalLahir = &tanggalLahir.String
	u.NamaUsaha = &namaUsaha.String
	u.JenisDagangan = &jenisDagangan.String
	u.JenisLapak = &jenisLapak.String
	u.PerkiraanHarga = &perkiraanHarga.String
	u.Alamat = &alamat.String
	u.StatusVerifikasi = &statusVerifikasi.String

	return &u, nil
}

// UpdatePedagang meng-update data akun (users) sekaligus profil dagangan
// (pedagang_profiles) dalam satu transaksi. NIK, email, dan tanggal lahir
// sengaja gak ikut diupdate di sini -- itu data identitas yang dikunci
// (disabled) di form edit, konsisten sama halaman Edit Petugas/Superadmin.
func (r *PedagangRepository) UpdatePedagang(ctx context.Context, id, name, phone, namaUsaha, jenisDagangan, jenisLapak string) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	_, err = tx.Exec(ctx,
		`UPDATE users SET name = $1, phone = $2, updated_at = NOW() WHERE id = $3 AND deleted_at IS NULL`,
		name, phone, id,
	)
	if err != nil {
		return err
	}

	_, err = tx.Exec(ctx,
		`UPDATE pedagang_profiles 
		 SET nama_lengkap = $1, nama_usaha = $2, jenis_dagangan = $3::jenis_dagangan_enum, jenis_lapak = $4::jenis_lapak_enum, updated_at = NOW()
		 WHERE user_id = $5 AND deleted_at IS NULL`,
		name, namaUsaha, jenisDagangan, jenisLapak, id,
	)
	if err != nil {
		return err
	}

	return tx.Commit(ctx)
}

// DeletePedagang soft-delete pedagang
func (r *PedagangRepository) DeletePedagang(ctx context.Context, id string) error {
	_, err := r.db.Exec(ctx, `UPDATE users SET deleted_at = NOW() WHERE id = $1`, id)
	return err
}