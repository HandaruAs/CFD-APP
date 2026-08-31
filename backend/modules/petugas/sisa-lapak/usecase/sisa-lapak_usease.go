package usecase

import (
	"context"
	"errors"
	"cfd-backend/modules/petugas/sisa-lapak/entity"
)

type Repository interface {
	GetSisaLapak(ctx context.Context) ([]entity.KecamatanData, error)
	CreateJalan(ctx context.Context, kodeJalan, namaJalan string, kapasitas int, instansiID string) error
	UpdateJalan(ctx context.Context, id, namaJalan string, kapasitas int) error
	DeleteJalan(ctx context.Context, id string) error
	GetInstansiByNama(ctx context.Context, namaUnit string) (string, error)
	GetAllInstansi(ctx context.Context) ([]entity.InstansiData, error)
}

type Usecase struct {
	repo Repository
}

func NewUsecase(repo Repository) *Usecase {
	return &Usecase{repo: repo}
}

func (u *Usecase) GetSisaLapak(ctx context.Context) ([]entity.KecamatanData, error) {
	return u.repo.GetSisaLapak(ctx)
}

func (u *Usecase) CreateJalan(ctx context.Context, req *entity.CreateJalanRequest) error {
	// Cek instansi
	instansiID, err := u.repo.GetInstansiByNama(ctx, req.InstansiID)
	if err != nil {
		return err
	}
	if instansiID == "" {
		return errors.New("kecamatan tidak ditemukan")
	}
	return u.repo.CreateJalan(ctx, req.KodeJalan, req.NamaJalan, req.Kapasitas, instansiID)
}

func (u *Usecase) UpdateJalan(ctx context.Context, id string, req *entity.UpdateJalanRequest) error {
	return u.repo.UpdateJalan(ctx, id, req.NamaJalan, req.Kapasitas)
}

func (u *Usecase) DeleteJalan(ctx context.Context, id string) error {
	return u.repo.DeleteJalan(ctx, id)
}

func (u *Usecase) GetAllInstansi(ctx context.Context) ([]entity.InstansiData, error) {
	return u.repo.GetAllInstansi(ctx)
}