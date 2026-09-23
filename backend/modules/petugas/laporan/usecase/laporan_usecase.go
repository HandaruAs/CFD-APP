package usecase

import (
	"context"
	"errors"
	"strings"
	"time"

	"cfd-backend/modules/petugas/laporan/entity"
	"cfd-backend/modules/petugas/laporan/repository"
)

type LaporanUsecase interface {
	GetLaporan(ctx context.Context, req *entity.LaporanRequest) (*entity.LaporanResponse, error)
	GetStatsKehadiran(ctx context.Context, startDate, endDate string) (*entity.StatsResponse, error)
	GetDetailKehadiran(ctx context.Context, kehadiranID string) (*entity.DetailKehadiranResponse, error)
}

// ErrKehadiranTidakDitemukan dikembalikan kalau id kehadiran tidak ada.
var ErrKehadiranTidakDitemukan = errors.New("data kehadiran tidak ditemukan")

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

// GetDetailKehadiran ambil detail 1 baris kehadiran. NIK dan email pedagang
// disensor di sini (server), jadi data aslinya tidak pernah sampai ke browser.
func (u *laporanUsecase) GetDetailKehadiran(ctx context.Context, kehadiranID string) (*entity.DetailKehadiranResponse, error) {
	raw, err := u.repo.GetDetailKehadiran(ctx, kehadiranID)
	if err != nil {
		return nil, err
	}
	if raw == nil {
		return nil, ErrKehadiranTidakDitemukan
	}

	var resp entity.DetailKehadiranResponse

	resp.Kehadiran.ID = raw.KehadiranID
	resp.Kehadiran.Tanggal = raw.Tanggal
	resp.Kehadiran.NamaSesi = raw.NamaSesi
	resp.Kehadiran.WaktuCheckin = raw.WaktuCheckin
	resp.Kehadiran.WaktuCheckout = raw.WaktuCheckout
	resp.Kehadiran.Omset = raw.Omset
	resp.Kehadiran.Status = raw.Status
	resp.Kehadiran.DicatatOleh = raw.DicatatOleh

	resp.Lokasi.NamaJalan = raw.NamaJalan
	resp.Lokasi.Kecamatan = raw.Kecamatan
	resp.Lokasi.NomorLapak = raw.NomorLapak
	resp.Lokasi.LokasiLapak = raw.LokasiLapak

	resp.Usaha.NamaUsaha = raw.NamaUsaha
	resp.Usaha.JenisDagangan = raw.JenisDagangan
	resp.Usaha.JenisLapak = raw.JenisLapak

	resp.Pribadi.NamaLengkap = raw.NamaLengkap
	resp.Pribadi.NIK = sensorNIK(raw.NIK)
	resp.Pribadi.Email = sensorEmail(raw.Email)
	resp.Pribadi.TanggalLahir = raw.TanggalLahir
	resp.Pribadi.StatusPedagang = raw.StatusPedagang

	return &resp, nil
}

// sensorNIK: tampilkan 4 digit awal & 4 digit akhir saja.
// "3578012345670001" -> "3578********0001"
func sensorNIK(nik string) string {
	nik = strings.TrimSpace(nik)
	if nik == "" || nik == "-" {
		return ""
	}
	r := []rune(nik)
	if len(r) <= 8 {
		return strings.Repeat("*", len(r))
	}
	return string(r[:4]) + strings.Repeat("*", len(r)-8) + string(r[len(r)-4:])
}

// sensorEmail: tampilkan 2 huruf pertama sebelum @, sisanya disensor.
// "handaru@gmail.com" -> "ha***@gmail.com"
func sensorEmail(email string) string {
	email = strings.TrimSpace(email)
	at := strings.LastIndex(email, "@")
	if at <= 0 {
		if email == "" {
			return ""
		}
		return "***"
	}
	lokal := []rune(email[:at])
	tampil := 2
	if len(lokal) <= 2 {
		tampil = 1
	}
	return string(lokal[:tampil]) + "***" + email[at:]
}