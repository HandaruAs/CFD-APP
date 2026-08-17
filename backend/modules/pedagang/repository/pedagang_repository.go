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

// CreatePengajuan bikin baris pedagang_profiles baru
func (r *PedagangRepository) CreatePengajuan(ctx context.Context, userID, nik, namaUsaha, jenisDagangan, perkiraanHarga, alamat string) (string, error) {
	var id string
	err := r.db.QueryRow(ctx,
		`INSERT INTO pedagang_profiles 
		 (user_id, nik, nama_usaha, jenis_dagangan, perkiraan_harga, alamat, status_verifikasi)
		 VALUES ($1, $2, $3, $4, $5, $6, 'pending')
		 RETURNING id`,
		userID, nik, namaUsaha, jenisDagangan, perkiraanHarga, alamat,
	).Scan(&id)
	if err != nil {
		return "", err
	}
	return id, nil
}

// GetPengajuanByUserID dipakai buat nampilin status pengajuan
func (r *PedagangRepository) GetPengajuanByUserID(ctx context.Context, userID string) (*entity.PengajuanStatus, error) {
	var p entity.PengajuanStatus
	err := r.db.QueryRow(ctx,
		`SELECT id, nik, nama_usaha, jenis_dagangan, perkiraan_harga, alamat, status_verifikasi, catatan
		 FROM pedagang_profiles
		 WHERE user_id = $1 AND deleted_at IS NULL`,
		userID,
	).Scan(&p.ID, &p.NIK, &p.NamaUsaha, &p.JenisDagangan, &p.PerkiraanHarga, &p.Alamat, &p.StatusVerifikasi, &p.Catatan)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &p, nil
}

// ListPedagang mengambil data pedagang beserta profilnya
func (r *PedagangRepository) ListPedagang(ctx context.Context) ([]entity.PedagangUserDTO, int, error) {
	rows, err := r.db.Query(ctx, `
		SELECT 
			u.id, u.name, u.email, u.phone, u.created_at, u.status,
			p.nik, p.nama_usaha, p.jenis_dagangan, p.perkiraan_harga, p.alamat, p.status_verifikasi
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
		var createdAt, status, nik, namaUsaha, jenisDagangan, perkiraanHarga, alamat, statusVerifikasi sql.NullString

		err := rows.Scan(
			&u.ID, &u.Name, &u.Email, &u.Phone,
			&createdAt, &status,
			&nik, &namaUsaha, &jenisDagangan, &perkiraanHarga, &alamat, &statusVerifikasi,
		)
		if err != nil {
			return nil, 0, err
		}

		u.JoinedAt = createdAt.String
		u.Active = status.String == "active"
		u.Initial = string([]rune(u.Name)[0])
		u.NIK = &nik.String
		u.NamaUsaha = &namaUsaha.String
		u.JenisDagangan = &jenisDagangan.String
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
	var createdAt, status, nik, namaUsaha, jenisDagangan, perkiraanHarga, alamat, statusVerifikasi sql.NullString

	err := r.db.QueryRow(ctx, `
		SELECT 
			u.id, u.name, u.email, u.phone, u.created_at, u.status,
			p.nik, p.nama_usaha, p.jenis_dagangan, p.perkiraan_harga, p.alamat, p.status_verifikasi
		FROM users u
		JOIN user_roles ur ON ur.user_id = u.id AND ur.deleted_at IS NULL
		JOIN roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
		LEFT JOIN pedagang_profiles p ON p.user_id = u.id AND p.deleted_at IS NULL
		WHERE u.id = $1 AND u.deleted_at IS NULL
	`, id,
	).Scan(
		&u.ID, &u.Name, &u.Email, &u.Phone,
		&createdAt, &status,
		&nik, &namaUsaha, &jenisDagangan, &perkiraanHarga, &alamat, &statusVerifikasi,
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
	u.NamaUsaha = &namaUsaha.String
	u.JenisDagangan = &jenisDagangan.String
	u.PerkiraanHarga = &perkiraanHarga.String
	u.Alamat = &alamat.String
	u.StatusVerifikasi = &statusVerifikasi.String

	return &u, nil
}

// --- TAMBAHAN BARU: DeletePedagang ---
func (r *PedagangRepository) DeletePedagang(ctx context.Context, id string) error {
	_, err := r.db.Exec(ctx, `UPDATE users SET deleted_at = NOW() WHERE id = $1`, id)
	return err
}