package repository

import (
	"context"

	"cfd-backend/modules/pedagang/entity" // <-- IMPORT BERUBAH

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type PedagangRepository struct {
	db *pgxpool.Pool
}

func NewPedagangRepository(db *pgxpool.Pool) *PedagangRepository {
	return &PedagangRepository{db: db}
}

// CreatePengajuan bikin baris pedagang_profiles baru buat user yang sedang login.
func (r *PedagangRepository) CreatePengajuan(ctx context.Context, userID, nik, namaUsaha, jenisDagangan, alamat string) (string, error) {
	var id string
	err := r.db.QueryRow(ctx,
		`INSERT INTO pedagang_profiles (user_id, nik, nama_usaha, jenis_dagangan, alamat, status_verifikasi)
		 VALUES ($1, $2, $3, $4, $5, 'pending')
		 RETURNING id`,
		userID, nik, namaUsaha, jenisDagangan, alamat,
	).Scan(&id)
	if err != nil {
		return "", err
	}
	return id, nil
}

// GetPengajuanByUserID dipakai buat nampilin status pengajuan pedagang di dashboard.
func (r *PedagangRepository) GetPengajuanByUserID(ctx context.Context, userID string) (*entity.PengajuanStatus, error) {
	var p entity.PengajuanStatus
	err := r.db.QueryRow(ctx,
		`SELECT id, nik, nama_usaha, jenis_dagangan, alamat, status_verifikasi, catatan
		 FROM pedagang_profiles
		 WHERE user_id = $1 AND deleted_at IS NULL`,
		userID,
	).Scan(&p.ID, &p.NIK, &p.NamaUsaha, &p.JenisDagangan, &p.Alamat, &p.StatusVerifikasi, &p.Catatan)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil // belum pernah ajukan, ini kondisi normal bukan error
		}
		return nil, err
	}
	return &p, nil
}