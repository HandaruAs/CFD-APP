package repository

import (
	"context"
	"errors"

	"cfd-backend/modules/shared/sesi"

	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrJalanTidakDitemukan     = errors.New("jalan tidak ditemukan")
	ErrKecamatanTidakDitemukan = errors.New("kecamatan tidak ditemukan")
)

type AcakLapakRepository struct {
	db *pgxpool.Pool
}

func NewAcakLapakRepository(db *pgxpool.Pool) *AcakLapakRepository {
	return &AcakLapakRepository{db: db}
}

// GetActiveSessionID delegasi ke resolver bersama, biar generate-slot
// beroperasi di sesi yang SAMA dengan tempat klaim pedagang beneran
// nempel. Lihat modules/shared/sesi.
func (r *AcakLapakRepository) GetActiveSessionID(ctx context.Context) (string, error) {
	return sesi.ResolveSesiHariIni(ctx, r.db)
}