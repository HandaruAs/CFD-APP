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
	res.HariIni.Tanggal = now.In(wib).Format("2006-01-02")

	events, err := u.repo.GetEventHariIni(ctx)
	if err != nil {
		return nil, err
	}

	// Semua event hari ini + jumlah lapak & kehadiran gabungan.
	res.HariIni.Events = make([]entity.EventHariIni, 0, len(events))
	for _, e := range events {
		status, sisa := statusEvent(e, now)
		res.HariIni.Events = append(res.HariIni.Events, entity.EventHariIni{
			ID: e.ID, Nama: e.Nama, Status: status, JamMulai: e.JamMulai, JamSelesai: e.JamSelesai,
			SisaMenit: sisa, Titik: e.Titik, Kapasitas: e.Kapasitas,
			Klaim: e.Klaim, CheckIn: e.CheckIn, CheckOut: e.CheckOut, Omset: e.Omset,
		})
		if status == "dibatalkan" {
			continue
		}
		res.HariIni.Lapak.Kapasitas += e.Kapasitas
		res.HariIni.Lapak.Terisi += e.Klaim
		res.HariIni.Hadir.Klaim += e.Klaim
		res.HariIni.Hadir.CheckIn += e.CheckIn
		res.HariIni.Hadir.CheckOut += e.CheckOut
	}
	res.HariIni.Lapak.Persen = persen(res.HariIni.Lapak.Terisi, res.HariIni.Lapak.Kapasitas)
	res.HariIni.Sesi = ringkasanSesi(res.HariIni.Events)

	if res.Tren.Sesi, err = u.repo.GetTrenSesi(ctx, jumlahSesiTren); err != nil {
		return nil, err
	}
	if res.Tren.Minggu, err = u.repo.GetTrenMinggu(ctx, jumlahMingguTren); err != nil {
		return nil, err
	}
	return res, nil
}

var wib = time.FixedZone("WIB", 7*3600)

// statusEvent: status event dalam istilah dashboard + sisa menit kalau
// sedang berjalan. Jam yang sudah lewat dianggap selesai walau scheduler
// belum sempat mengubah statusnya.
func statusEvent(e repository.EventRow, now time.Time) (string, int) {
	switch e.Status {
	case "dibatalkan":
		return "dibatalkan", 0
	case "selesai_normal", "diakhiri_awal":
		return "selesai", 0
	}
	if !now.Before(e.SelesaiAt) {
		return "selesai", 0
	}
	if e.Status == "berlangsung" || e.Status == "diperpanjang" || !now.Before(e.MulaiAt) {
		return "berjalan", int(math.Ceil(e.SelesaiAt.Sub(now).Minutes()))
	}
	return "terjadwal", 0
}

// ringkasanSesi memilih satu event untuk kartu "Sesi hari ini" (dipakai
// tampilan lama/mobile): yang sedang berjalan, lalu yang terjadwal paling
// awal, lalu yang terakhir selesai, lalu yang dibatalkan.
func ringkasanSesi(events []entity.EventHariIni) entity.SesiHariIni {
	pilih := func(status string, terakhir bool) *entity.EventHariIni {
		var hasil *entity.EventHariIni
		for i := range events {
			if events[i].Status != status {
				continue
			}
			if hasil == nil || terakhir {
				hasil = &events[i]
			}
		}
		return hasil
	}
	for _, c := range []struct {
		status   string
		terakhir bool
	}{{"berjalan", false}, {"terjadwal", false}, {"selesai", true}, {"dibatalkan", true}} {
		if e := pilih(c.status, c.terakhir); e != nil {
			nama, mulai, selesai := e.Nama, e.JamMulai, e.JamSelesai
			return entity.SesiHariIni{Status: e.Status, NamaSesi: &nama, JamMulai: &mulai, JamSelesai: &selesai, SisaMenit: e.SisaMenit}
		}
	}
	return entity.SesiHariIni{Status: "belum_ada"}
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