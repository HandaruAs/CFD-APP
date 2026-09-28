package usecase

import (
	"context"
	"errors"
	"time"

	"cfd-backend/modules/admin/laporan/entity"
	"cfd-backend/modules/admin/laporan/repository"
	"cfd-backend/pkg/presence"
)

const (
	// Default periode kalau tanggal tidak dikirim: 30 hari terakhir.
	defaultHari = 30
	// Batas rentang supaya query tetap ringan.
	maksHari = 366
	// Baris kehadiran maksimal yang dikirim ke browser.
	BatasKehadiran = 2000
)

var ErrTanggalTidakValid = errors.New("format tanggal tidak valid, gunakan YYYY-MM-DD")
var ErrRentangTerbalik = errors.New("tanggal mulai tidak boleh setelah tanggal selesai")
var ErrRentangTerlaluPanjang = errors.New("rentang laporan maksimal 1 tahun")

type LaporanUsecase interface {
	GetLaporan(ctx context.Context, mulai, selesai string) (*entity.LaporanResponse, error)
}

type laporanUsecase struct {
	repo repository.LaporanRepository
}

func NewLaporanUsecase(repo repository.LaporanRepository) LaporanUsecase {
	return &laporanUsecase{repo: repo}
}

func (u *laporanUsecase) GetLaporan(ctx context.Context, mulai, selesai string) (*entity.LaporanResponse, error) {
	mulai, selesai, err := normalisasiPeriode(mulai, selesai)
	if err != nil {
		return nil, err
	}

	res := &entity.LaporanResponse{Periode: entity.Periode{Mulai: mulai, Selesai: selesai}}

	if res.Ringkasan.Pedagang, err = u.repo.RingkasanPedagang(ctx, mulai, selesai); err != nil {
		return nil, err
	}
	if res.Ringkasan.Petugas, err = u.repo.RingkasanPetugas(ctx, mulai, selesai); err != nil {
		return nil, err
	}
	if res.Ringkasan.Kehadiran, err = u.repo.RingkasanKehadiran(ctx, mulai, selesai); err != nil {
		return nil, err
	}
	if res.Ringkasan.Klaim, err = u.repo.RingkasanKlaim(ctx, mulai, selesai); err != nil {
		return nil, err
	}
	if res.Pedagang, err = u.repo.ListPedagang(ctx, mulai, selesai); err != nil {
		return nil, err
	}
	if res.Petugas, err = u.repo.ListPetugas(ctx, mulai, selesai); err != nil {
		return nil, err
	}
	// Ambil 1 baris lebih untuk tahu apakah datanya terpotong.
	kehadiran, err := u.repo.ListKehadiran(ctx, mulai, selesai, BatasKehadiran+1)
	if err != nil {
		return nil, err
	}
	if len(kehadiran) > BatasKehadiran {
		kehadiran = kehadiran[:BatasKehadiran]
		res.KehadiranTerpotong = true
	}
	res.Kehadiran = kehadiran

	// Status online petugas diambil dari presence (in-memory), sama seperti
	// daftar petugas di Manajemen User.
	for i := range res.Petugas {
		if presence.IsOnline(res.Petugas[i].UserID) {
			res.Petugas[i].Online = true
			res.Ringkasan.Petugas.Online++
		}
	}

	return res, nil
}

// normalisasiPeriode: default 30 hari terakhir (WIB), validasi format &
// urutan tanggal, dan batasi rentang maksimal.
func normalisasiPeriode(mulai, selesai string) (string, string, error) {
	wib := time.FixedZone("WIB", 7*60*60)
	hariIni := time.Now().In(wib)

	if selesai == "" {
		selesai = hariIni.Format("2006-01-02")
	}
	tSelesai, err := time.Parse("2006-01-02", selesai)
	if err != nil {
		return "", "", ErrTanggalTidakValid
	}
	if mulai == "" {
		mulai = tSelesai.AddDate(0, 0, -(defaultHari - 1)).Format("2006-01-02")
	}
	tMulai, err := time.Parse("2006-01-02", mulai)
	if err != nil {
		return "", "", ErrTanggalTidakValid
	}
	if tMulai.After(tSelesai) {
		return "", "", ErrRentangTerbalik
	}
	if tSelesai.Sub(tMulai) > maksHari*24*time.Hour {
		return "", "", ErrRentangTerlaluPanjang
	}
	return mulai, selesai, nil
}