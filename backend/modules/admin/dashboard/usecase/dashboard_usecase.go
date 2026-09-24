package usecase

import (
	"context"
	"math"
	"strconv"
	"strings"
	"time"

	"cfd-backend/modules/admin/dashboard/entity"
	"cfd-backend/modules/admin/dashboard/repository"
)

// Angka-angka "aturan main" dashboard dikumpulkan di sini supaya gampang
// diubah tanpa ngubah query.
const (
	jumlahSesiTren   = 8 // titik di grafik kehadiran & omset
	jumlahMingguTren = 8 // batang di grafik pertumbuhan pedagang
)

type DashboardUsecase interface {
	GetDashboard(ctx context.Context) (*entity.DashboardResponse, error)
}

type dashboardUsecase struct {
	repo repository.DashboardRepository
}

func NewDashboardUsecase(repo repository.DashboardRepository) DashboardUsecase {
	return &dashboardUsecase{repo: repo}
}

func (u *dashboardUsecase) GetDashboard(ctx context.Context) (*entity.DashboardResponse, error) {
	now := time.Now()
	res := &entity.DashboardResponse{}
	res.HariIni.Tanggal = now.Format("2006-01-02")

	// ---------- 1. HARI INI ----------
	sesi, err := u.repo.GetSesiHariIni(ctx)
	if err != nil {
		return nil, err
	}
	res.HariIni.Sesi = statusSesi(sesi, now)

	var sesiID *string
	if sesi != nil {
		sesiID = &sesi.ID
		hadir, err := u.repo.GetHadirHariIni(ctx, sesi.ID)
		if err != nil {
			return nil, err
		}
		res.HariIni.Hadir = hadir
	}

	lapak, err := u.repo.GetLapakHariIni(ctx, sesiID)
	if err != nil {
		return nil, err
	}
	lapak.Persen = persen(lapak.Terisi, lapak.Kapasitas)
	res.HariIni.Lapak = lapak

	// ---------- 2. TREN ----------
	if res.Tren.Sesi, err = u.repo.GetTrenSesi(ctx, jumlahSesiTren); err != nil {
		return nil, err
	}
	if res.Tren.Minggu, err = u.repo.GetTrenMinggu(ctx, jumlahMingguTren); err != nil {
		return nil, err
	}

	return res, nil
}

// ============================================================
// HELPER
// ============================================================

// statusSesi menerjemahkan baris cfd_sessions hari ini jadi status yang
// gampang ditampilkan. Aturan "berjalan" disamakan dengan modul Jam
// Operasional: is_active, belum diakhiri, dan jam sekarang di dalam
// rentang jam mulai - jam selesai.
func statusSesi(s *repository.SesiRow, now time.Time) entity.SesiHariIni {
	// Baris tanpa jam mulai = sesi otomatis yang dibuat sistem waktu
	// pedagang klaim / petugas acak lapak -- belum dibuka petugas.
	if s == nil || s.JamMulai == nil {
		return entity.SesiHariIni{Status: "belum_ada"}
	}

	out := entity.SesiHariIni{
		NamaSesi:   &s.NamaSesi,
		JamMulai:   s.JamMulai,
		JamSelesai: s.JamSelesai,
	}
	if s.JamSelesaiAktual != nil {
		out.JamSelesai = s.JamSelesaiAktual
	}

	if s.Status == "dibatalkan" {
		out.Status = "dibatalkan"
		return out
	}

	nowMenit := now.Hour()*60 + now.Minute()
	mulai, errMulai := jamKeMenit(*s.JamMulai)
	selesai := 24 * 60
	if s.JamSelesai != nil {
		if m, err := jamKeMenit(*s.JamSelesai); err == nil {
			selesai = m
		}
	}

	switch {
	case s.JamSelesaiAktual != nil || s.Status == "selesai" || s.Status == "ditutup":
		out.Status = "selesai"
	case !s.IsActive:
		out.Status = "belum_ada"
	case errMulai == nil && nowMenit < mulai:
		out.Status = "terjadwal"
	case nowMenit >= selesai:
		out.Status = "selesai"
	default:
		out.Status = "berjalan"
		out.SisaMenit = selesai - nowMenit
	}
	return out
}

func jamKeMenit(jam string) (int, error) {
	bagian := strings.SplitN(jam, ":", 3)
	if len(bagian) < 2 {
		return 0, strconv.ErrSyntax
	}
	h, err := strconv.Atoi(bagian[0])
	if err != nil {
		return 0, err
	}
	m, err := strconv.Atoi(bagian[1])
	if err != nil {
		return 0, err
	}
	return h*60 + m, nil
}

// persen dibulatkan 1 angka di belakang koma; 0 kalau kapasitasnya 0.
func persen(terisi, kapasitas int) float64 {
	if kapasitas <= 0 {
		return 0
	}
	return math.Round(float64(terisi)/float64(kapasitas)*1000) / 10
}