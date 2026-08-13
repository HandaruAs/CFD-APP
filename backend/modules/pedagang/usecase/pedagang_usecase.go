package usecase

import (
	"context"

	"cfd-backend/modules/pedagang/entity"
)

// PedagangRepository interface kecil -- method yang dipakai PedagangUsecase aja.
type PedagangRepository interface {
	CreatePengajuan(ctx context.Context, userID, nik, namaUsaha, jenisDagangan, alamat string) (string, error)
	GetPengajuanByUserID(ctx context.Context, userID string) (*entity.PengajuanStatus, error)
}

type PedagangUsecase interface {
	AjukanUsaha(ctx context.Context, userID string, req *entity.PengajuanUsahaRequest) (string, error)
	StatusPengajuan(ctx context.Context, userID string) (*entity.PengajuanStatus, error)
}

type pedagangUsecase struct {
	pedagangRepo PedagangRepository
}

func NewPedagangUsecase(pedagangRepo PedagangRepository) PedagangUsecase {
	return &pedagangUsecase{pedagangRepo: pedagangRepo}
}

func (u *pedagangUsecase) AjukanUsaha(ctx context.Context, userID string, req *entity.PengajuanUsahaRequest) (string, error) {
	return u.pedagangRepo.CreatePengajuan(
		ctx,
		userID,
		req.NIK,
		req.NamaUsaha,
		req.JenisDagangan,
		req.Alamat,
	)
}

func (u *pedagangUsecase) StatusPengajuan(ctx context.Context, userID string) (*entity.PengajuanStatus, error) {
	return u.pedagangRepo.GetPengajuanByUserID(ctx, userID)
}