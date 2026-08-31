package usecase

import (
	"context"
	"errors"

	"cfd-backend/modules/pedagang/entity"
)

var (
	ErrPendaftaranDitutup   = errors.New("pendaftaran pedagang sedang ditutup, cek lagi nanti")
	ErrDiluarJamPendaftaran = errors.New("saat ini di luar jam pendaftaran yang ditentukan petugas")
)

type PedagangRepository interface {
	CreatePengajuanMandiri(ctx context.Context, userID, nik, namaLengkap, tanggalLahir, namaUsaha, jenisDagangan, jenisLapak string) (string, error)
	GetStatusPendaftaran(ctx context.Context) (isOpen bool, dalamJam bool, err error)
	GetPengajuanByUserID(ctx context.Context, userID string) (*entity.PengajuanStatus, error)
	ListPedagang(ctx context.Context) ([]entity.PedagangUserDTO, int, error)
	GetPedagangStats(ctx context.Context) (entity.PedagangStatsResponse, error)
	GetPedagangByID(ctx context.Context, id string) (*entity.PedagangUserDTO, error)
	UpdatePedagang(ctx context.Context, id, name, phone, namaUsaha, jenisDagangan, jenisLapak string) error
	DeletePedagang(ctx context.Context, id string) error
}

type PedagangUsecase interface {
	AjukanUsaha(ctx context.Context, userID string, req *entity.PengajuanUsahaRequest) (string, error)
	CekStatusPendaftaran(ctx context.Context) (isOpen bool, dalamJam bool, err error) 
	StatusPengajuan(ctx context.Context, userID string) (*entity.PengajuanStatus, error)
	CreatePengajuanByAdmin(ctx context.Context, userID, nik, namaLengkap, tanggalLahir, namaUsaha, jenisDagangan, jenisLapak string) error
	ListPedagangByAdmin(ctx context.Context) ([]entity.PedagangUserDTO, int, error)
	GetPedagangStats(ctx context.Context) (entity.PedagangStatsResponse, error)
	GetPedagangByID(ctx context.Context, id string) (*entity.PedagangUserDTO, error)
	UpdatePedagangByAdmin(ctx context.Context, id, name, phone, namaUsaha, jenisDagangan, jenisLapak string) error
	DeletePedagangByAdmin(ctx context.Context, id string) error
}

type pedagangUsecase struct {
	pedagangRepo PedagangRepository
}

func NewPedagangUsecase(pedagangRepo PedagangRepository) PedagangUsecase {
	return &pedagangUsecase{pedagangRepo: pedagangRepo}
}

// AjukanUsaha dipakai alur self-service (pedagang daftar sendiri). Cuma
// bisa jalan kalau petugas lagi buka pendaftaran (is_open) DAN sekarang
// masih dalam rentang jam_buka_pendaftaran-jam_tutup_pendaftaran (kalau di-set).
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

// CreatePengajuanByAdmin dulu manggil method INSERT terpisah (CreatePengajuan)
// yang gak nyimpen tanggal_lahir/jenis_lapak. Sekarang langsung reuse
// CreatePengajuanMandiri, karena alur admin dan self-service insert ke
// kolom yang sama persis. Sengaja TIDAK dicek ke GetStatusPendaftaran --
// petugas/superadmin harus tetap bisa nambahin pedagang manual kapan aja.
func (u *pedagangUsecase) CreatePengajuanByAdmin(ctx context.Context, userID, nik, namaLengkap, tanggalLahir, namaUsaha, jenisDagangan, jenisLapak string) error {
	_, err := u.pedagangRepo.CreatePengajuanMandiri(ctx, userID, nik, namaLengkap, tanggalLahir, namaUsaha, jenisDagangan, jenisLapak)
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

func (u *pedagangUsecase) UpdatePedagangByAdmin(ctx context.Context, id, name, phone, namaUsaha, jenisDagangan, jenisLapak string) error {
	return u.pedagangRepo.UpdatePedagang(ctx, id, name, phone, namaUsaha, jenisDagangan, jenisLapak)
}

func (u *pedagangUsecase) DeletePedagangByAdmin(ctx context.Context, id string) error {
	return u.pedagangRepo.DeletePedagang(ctx, id)
}

func (u *pedagangUsecase) CekStatusPendaftaran(ctx context.Context) (bool, bool, error) {
	return u.pedagangRepo.GetStatusPendaftaran(ctx)
}