package usecase

import (
	"context"
	"errors"
	"time"

	"cfd-backend/modules/pedagang/lapak/entity"
	"cfd-backend/modules/pedagang/lapak/repository"
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

// GetStatus dipakai frontend buat 2 hal sekaligus: (1) nentuin apakah form
// klaim boleh ditampilin sama sekali (SesiAktif), dan (2) kalau boleh, apakah
// pedagang ini udah pernah klaim (SudahKlaim). Kalau sesi belum aktif (belum
// dibuka petugas / belum masuk jam / udah lewat jam), ini TETAP return 200
// dengan SesiAktif: false + pesan alasannya -- bukan error, biar frontend
// gampang nampilin banner tanpa perlu parsing error response.
func (u *lapakUsecase) GetStatus(ctx context.Context, userID string) (*entity.StatusLapakResponse, error) {
	sessionID, err := u.repo.GetActiveSessionID(ctx)
	if err != nil {
		switch {
		case errors.Is(err, repository.ErrTidakAdaSesiAktif),
			errors.Is(err, repository.ErrCheckInDitutup),
			errors.Is(err, repository.ErrDiluarJamCheckIn):
			pesan := err.Error()
			return &entity.StatusLapakResponse{
				SudahKlaim: false,
				SesiAktif:  false,
				PesanSesi:  &pesan,
			}, nil
		}
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
		return &entity.StatusLapakResponse{SudahKlaim: false, SesiAktif: true}, nil
	}

	return &entity.StatusLapakResponse{
		SudahKlaim:    true,
		SesiAktif:     true,
		NomorLapak:    &nomorLapak,
		NamaJalan:     &namaJalan,
		NamaKecamatan: &namaKecamatan,
		ClaimedAt:     &claimedAt,
	}, nil
}