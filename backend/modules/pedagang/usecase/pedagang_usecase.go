package usecase

import (
	"context"

	"cfd-backend/modules/pedagang/entity"
)

type PedagangRepository interface {
	CreatePengajuanMandiri(ctx context.Context, userID, nik, namaLengkap, tanggalLahir, namaUsaha, jenisDagangan, jenisLapak string) (string, error)
	CreatePengajuan(ctx context.Context, userID, nik, namaUsaha, jenisDagangan, perkiraanHarga, alamat string) (string, error)
	GetPengajuanByUserID(ctx context.Context, userID string) (*entity.PengajuanStatus, error)
	ListPedagang(ctx context.Context) ([]entity.PedagangUserDTO, int, error)
	GetPedagangStats(ctx context.Context) (entity.PedagangStatsResponse, error)
	GetPedagangByID(ctx context.Context, id string) (*entity.PedagangUserDTO, error)
	DeletePedagang(ctx context.Context, id string) error
}

type PedagangUsecase interface {
	AjukanUsaha(ctx context.Context, userID string, req *entity.PengajuanUsahaRequest) (string, error)
	StatusPengajuan(ctx context.Context, userID string) (*entity.PengajuanStatus, error)
	CreatePengajuanByAdmin(ctx context.Context, userID, nik, namaUsaha, jenisDagangan, perkiraanHarga, alamat string) error
	ListPedagangByAdmin(ctx context.Context) ([]entity.PedagangUserDTO, int, error)
	GetPedagangStats(ctx context.Context) (entity.PedagangStatsResponse, error)
	GetPedagangByID(ctx context.Context, id string) (*entity.PedagangUserDTO, error)
	DeletePedagangByAdmin(ctx context.Context, id string) error
}

type pedagangUsecase struct {
	pedagangRepo PedagangRepository
}

func NewPedagangUsecase(pedagangRepo PedagangRepository) PedagangUsecase {
	return &pedagangUsecase{pedagangRepo: pedagangRepo}
}

// AjukanUsaha dipakai alur self-service (pedagang daftar sendiri).
func (u *pedagangUsecase) AjukanUsaha(ctx context.Context, userID string, req *entity.PengajuanUsahaRequest) (string, error) {
	return u.pedagangRepo.CreatePengajuanMandiri(
		ctx,
		userID,
		req.NIK,
		req.NamaLengkap,
		req.TanggalLahir,
		req.NamaUsaha,
		req.JenisDagangan,
		req.JenisLapak,
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

func (u *pedagangUsecase) DeletePedagangByAdmin(ctx context.Context, id string) error {
	return u.pedagangRepo.DeletePedagang(ctx, id)
}