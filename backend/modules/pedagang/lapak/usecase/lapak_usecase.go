package usecase

import (
	"context"
	"time"

	"cfd-backend/modules/pedagang/lapak/entity"
)

type LapakRepository interface {
	GetActiveSessionID(ctx context.Context) (string, error)
	GetPedagangProfileIDByUserID(ctx context.Context, userID string) (string, error)
	ListKecamatan(ctx context.Context) ([]entity.KecamatanDTO, error)
	ListJalanByKecamatan(ctx context.Context, kecamatanID, sessionID string) ([]entity.JalanDTO, error)
	ClaimLapak(ctx context.Context, pedagangID, sessionID, jalanID string) (nomorLapak string, namaJalan string, claimedAt time.Time, err error)
	GetKlaimByPedagangSession(ctx context.Context, pedagangID, sessionID string) (nomorLapak, namaJalan, namaKecamatan string, claimedAt time.Time, found bool, err error)
}

type LapakUsecase interface {
	ListKecamatan(ctx context.Context) ([]entity.KecamatanDTO, error)
	ListJalan(ctx context.Context, kecamatanID string) ([]entity.JalanDTO, error)
	ClaimLapak(ctx context.Context, userID, jalanID string) (*entity.ClaimLapakResponse, error)
	GetStatus(ctx context.Context, userID string) (*entity.StatusLapakResponse, error)
}

type lapakUsecase struct {
	repo LapakRepository
}

func NewLapakUsecase(repo LapakRepository) LapakUsecase {
	return &lapakUsecase{repo: repo}
}

func (u *lapakUsecase) ListKecamatan(ctx context.Context) ([]entity.KecamatanDTO, error) {
	return u.repo.ListKecamatan(ctx)
}

func (u *lapakUsecase) ListJalan(ctx context.Context, kecamatanID string) ([]entity.JalanDTO, error) {
	sessionID, err := u.repo.GetActiveSessionID(ctx)
	if err != nil {
		return nil, err
	}
	return u.repo.ListJalanByKecamatan(ctx, kecamatanID, sessionID)
}

func (u *lapakUsecase) ClaimLapak(ctx context.Context, userID, jalanID string) (*entity.ClaimLapakResponse, error) {
	sessionID, err := u.repo.GetActiveSessionID(ctx)
	if err != nil {
		return nil, err
	}

	pedagangID, err := u.repo.GetPedagangProfileIDByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}

	nomorLapak, namaJalan, claimedAt, err := u.repo.ClaimLapak(ctx, pedagangID, sessionID, jalanID)
	if err != nil {
		return nil, err
	}

	return &entity.ClaimLapakResponse{
		NomorLapak: nomorLapak,
		NamaJalan:  namaJalan,
		ClaimedAt:  claimedAt,
	}, nil
}

func (u *lapakUsecase) GetStatus(ctx context.Context, userID string) (*entity.StatusLapakResponse, error) {
	sessionID, err := u.repo.GetActiveSessionID(ctx)
	if err != nil {
		return nil, err
	}

	pedagangID, err := u.repo.GetPedagangProfileIDByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}

	nomorLapak, namaJalan, namaKecamatan, claimedAt, found, err := u.repo.GetKlaimByPedagangSession(ctx, pedagangID, sessionID)
	if err != nil {
		return nil, err
	}

	if !found {
		return &entity.StatusLapakResponse{SudahKlaim: false}, nil
	}

	return &entity.StatusLapakResponse{
		SudahKlaim:    true,
		NomorLapak:    &nomorLapak,
		NamaJalan:     &namaJalan,
		NamaKecamatan: &namaKecamatan,
		ClaimedAt:     &claimedAt,
	}, nil
}