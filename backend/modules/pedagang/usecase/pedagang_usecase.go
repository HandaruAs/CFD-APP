package usecase

import (
	"context"

	"cfd-backend/modules/pedagang/entity"
)

type PedagangRepository interface {
	CreatePengajuan(ctx context.Context, userID, nik, namaUsaha, jenisDagangan, perkiraanHarga, alamat string) (string, error)
	GetPengajuanByUserID(ctx context.Context, userID string) (*entity.PengajuanStatus, error)
	ListPedagang(ctx context.Context) ([]entity.PedagangUserDTO, int, error)
	GetPedagangStats(ctx context.Context) (entity.PedagangStatsResponse, error)
	GetPedagangByID(ctx context.Context, id string) (*entity.PedagangUserDTO, error)
	DeletePedagang(ctx context.Context, id string) error // <-- TAMBAHAN
}

type PedagangUsecase interface {
	AjukanUsaha(ctx context.Context, userID string, req *entity.PengajuanUsahaRequest) (string, error)
	StatusPengajuan(ctx context.Context, userID string) (*entity.PengajuanStatus, error)
	CreatePengajuanByAdmin(ctx context.Context, userID, nik, namaUsaha, jenisDagangan, perkiraanHarga, alamat string) error
	ListPedagangByAdmin(ctx context.Context) ([]entity.PedagangUserDTO, int, error)
	GetPedagangStats(ctx context.Context) (entity.PedagangStatsResponse, error)
	GetPedagangByID(ctx context.Context, id string) (*entity.PedagangUserDTO, error)
	DeletePedagangByAdmin(ctx context.Context, id string) error // <-- TAMBAHAN
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
		req.PerkiraanHarga,
		req.Alamat,
	)
}

func (u *pedagangUsecase) StatusPengajuan(ctx context.Context, userID string) (*entity.PengajuanStatus, error) {
	return u.pedagangRepo.GetPengajuanByUserID(ctx, userID)
}

func (u *pedagangUsecase) CreatePengajuanByAdmin(ctx context.Context, userID, nik, namaUsaha, jenisDagangan, perkiraanHarga, alamat string) error {
	_, err := u.pedagangRepo.CreatePengajuan(ctx, userID, nik, namaUsaha, jenisDagangan, perkiraanHarga, alamat)
	return err
}

func (u *pedagangUsecase) ListPedagangByAdmin(ctx context.Context) ([]entity.PedagangUserDTO, int, error) {
	return u.pedagangRepo.ListPedagang(ctx)
}

func (u *pedagangUsecase) GetPedagangStats(ctx context.Context) (entity.PedagangStatsResponse, error) {
	return u.pedagangRepo.GetPedagangStats(ctx)
}

func (u *pedagangUsecase) GetPedagangByID(ctx context.Context, id string) (*entity.PedagangUserDTO, error) {
	return u.pedagangRepo.GetPedagangByID(ctx, id)
}

// --- TAMBAHAN BARU: DeletePedagangByAdmin ---
func (u *pedagangUsecase) DeletePedagangByAdmin(ctx context.Context, id string) error {
	return u.pedagangRepo.DeletePedagang(ctx, id)
}