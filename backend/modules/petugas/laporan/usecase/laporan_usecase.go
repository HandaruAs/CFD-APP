package usecase

import (
	"context"
	"time"

	"cfd-backend/modules/petugas/laporan/entity"
	"cfd-backend/modules/petugas/laporan/repository"
)

type LaporanUsecase interface {
	GetLaporan(ctx context.Context, req *entity.LaporanRequest) (*entity.LaporanResponse, error)
	GetStatsKehadiran(ctx context.Context, startDate, endDate string) (*entity.StatsResponse, error)
}

type laporanUsecase struct {
	repo repository.LaporanRepository
}

func NewLaporanUsecase(repo repository.LaporanRepository) LaporanUsecase {
	return &laporanUsecase{repo: repo}
}

func (u *laporanUsecase) GetLaporan(ctx context.Context, req *entity.LaporanRequest) (*entity.LaporanResponse, error) {
	if req.StartDate == "" {
		req.StartDate = time.Now().Format("2006-01-02")
	}
	if req.EndDate == "" {
		req.EndDate = req.StartDate
	}
	if req.Page == 0 {
		req.Page = 1
	}
	if req.Limit == 0 {
		req.Limit = 20
	}

	data, total, err := u.repo.GetKehadiranByDateRange(ctx, req.StartDate, req.EndDate, req.Search, req.Page, req.Limit)
	if err != nil {
		return nil, err
	}

	stats, err := u.repo.GetStatsKehadiran(ctx, req.StartDate, req.EndDate)
	if err != nil {
		return nil, err
	}

	return &entity.LaporanResponse{
		TotalTerdaftar: stats.TotalTerdaftar,
		TotalCheckin:   stats.TotalCheckin,
		TotalCheckout:  stats.TotalCheckout,
		TotalOmset:     stats.TotalOmset,
		RataOmset:      stats.RataOmset,
		PersenHadir:    stats.PersenHadir,
		Data:           data,
		Page:           req.Page,
		Limit:          req.Limit,
		Total:          total,
	}, nil
}

func (u *laporanUsecase) GetStatsKehadiran(ctx context.Context, startDate, endDate string) (*entity.StatsResponse, error) {
	if startDate == "" {
		startDate = time.Now().Format("2006-01-02")
	}
	if endDate == "" {
		endDate = startDate
	}
	return u.repo.GetStatsKehadiran(ctx, startDate, endDate)
}