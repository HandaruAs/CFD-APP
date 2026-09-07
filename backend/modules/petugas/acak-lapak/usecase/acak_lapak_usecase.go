package usecase

import (
	"context"

	"cfd-backend/modules/petugas/acak-lapak/entity"
)

type AcakLapakRepository interface {
	GetActiveSessionID(ctx context.Context) (string, error)
	AcakJalan(ctx context.Context, sessionID, jalanID string) (namaJalan string, jumlahDiacak int, err error)
	AcakKecamatan(ctx context.Context, sessionID, kecamatanID string) (namaKecamatan string, jumlahJalan int, jumlahDiacak int, err error)
	AcakSemua(ctx context.Context, sessionID string) (jumlahKecamatan, jumlahJalan, jumlahDiacak int, err error)
}

type AcakLapakUsecase interface {
	AcakJalan(ctx context.Context, jalanID string) (*entity.AcakJalanResponse, error)
	AcakKecamatan(ctx context.Context, kecamatanID string) (*entity.AcakKecamatanResponse, error)
	AcakSemua(ctx context.Context) (*entity.AcakSemuaResponse, error)
}

type acakLapakUsecase struct {
	repo AcakLapakRepository
}

func NewAcakLapakUsecase(repo AcakLapakRepository) AcakLapakUsecase {
	return &acakLapakUsecase{repo: repo}
}

func (u *acakLapakUsecase) AcakJalan(ctx context.Context, jalanID string) (*entity.AcakJalanResponse, error) {
	sessionID, err := u.repo.GetActiveSessionID(ctx)
	if err != nil {
		return nil, err
	}

	namaJalan, jumlahDiacak, err := u.repo.AcakJalan(ctx, sessionID, jalanID)
	if err != nil {
		return nil, err
	}

	return &entity.AcakJalanResponse{
		JalanID:      jalanID,
		NamaJalan:    namaJalan,
		JumlahDiacak: jumlahDiacak,
	}, nil
}

func (u *acakLapakUsecase) AcakKecamatan(ctx context.Context, kecamatanID string) (*entity.AcakKecamatanResponse, error) {
	sessionID, err := u.repo.GetActiveSessionID(ctx)
	if err != nil {
		return nil, err
	}

	namaKecamatan, jumlahJalan, jumlahDiacak, err := u.repo.AcakKecamatan(ctx, sessionID, kecamatanID)
	if err != nil {
		return nil, err
	}

	return &entity.AcakKecamatanResponse{
		KecamatanID:   kecamatanID,
		NamaKecamatan: namaKecamatan,
		JumlahJalan:   jumlahJalan,
		JumlahDiacak:  jumlahDiacak,
	}, nil
}

func (u *acakLapakUsecase) AcakSemua(ctx context.Context) (*entity.AcakSemuaResponse, error) {
	sessionID, err := u.repo.GetActiveSessionID(ctx)
	if err != nil {
		return nil, err
	}

	jumlahKecamatan, jumlahJalan, jumlahDiacak, err := u.repo.AcakSemua(ctx, sessionID)
	if err != nil {
		return nil, err
	}

	return &entity.AcakSemuaResponse{
		JumlahKecamatan: jumlahKecamatan,
		JumlahJalan:     jumlahJalan,
		JumlahDiacak:    jumlahDiacak,
	}, nil
}
