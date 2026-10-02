package usecase

import (
	"context"
	"errors"
	"math"
	"time"

	"cfd-backend/modules/event-info/entity"
	"cfd-backend/modules/shared/eventaturan"
)

type EventInfoRepository interface {
	ListEvent(ctx context.Context, hariKeDepan int, termasukBatal bool) ([]entity.EventInfo, error)
	ListPilihan(ctx context.Context, mulai, selesai string) ([]entity.EventPilihan, error)
}

type EventInfoUsecase interface {
	// Publik: event hari ini & 14 hari ke depan yang tidak dibatalkan.
	ListPublik(ctx context.Context) ([]entity.EventInfo, error)
	// Petugas: semua event hari ini (termasuk yang dibatalkan).
	ListHariIni(ctx context.Context) ([]entity.EventInfo, error)
	// Petugas: pilihan event untuk filter laporan, per rentang tanggal.
	ListPilihan(ctx context.Context, mulai, selesai string) ([]entity.EventPilihan, error)
}

var ErrTanggalTidakValid = errors.New("format tanggal tidak valid, gunakan YYYY-MM-DD")

type eventInfoUsecase struct {
	repo EventInfoRepository
	now  func() time.Time
}

func NewEventInfoUsecase(repo EventInfoRepository) EventInfoUsecase {
	return &eventInfoUsecase{repo: repo, now: time.Now}
}

const hariKeDepanPublik = 14

func (u *eventInfoUsecase) ListPublik(ctx context.Context) ([]entity.EventInfo, error) {
	list, err := u.repo.ListEvent(ctx, hariKeDepanPublik, false)
	if err != nil {
		return nil, err
	}
	return u.lengkapi(list), nil
}

func (u *eventInfoUsecase) ListHariIni(ctx context.Context) ([]entity.EventInfo, error) {
	list, err := u.repo.ListEvent(ctx, 0, true)
	if err != nil {
		return nil, err
	}
	return u.lengkapi(list), nil
}

func (u *eventInfoUsecase) lengkapi(list []entity.EventInfo) []entity.EventInfo {
	now := u.now()
	for i := range list {
		e := &list[i]
		e.Sisa = max(0, e.KuotaTotal-e.Terisi)
		e.TotalMenit = int(e.SelesaiAt.Sub(e.MulaiAt).Minutes())
		e.StatusPendaftaran = eventaturan.StatusPendaftaran(e.StatusAsli, e.PendaftaranBukaAt, e.PendaftaranTutupAt, e.MulaiAt, now)
		switch {
		case e.StatusAsli == eventaturan.StatusDibatalkan:
			e.Status = "dibatalkan"
		case eventaturan.EventSudahSelesai(e.StatusAsli, e.SelesaiAt, now):
			e.Status = "selesai"
		case e.StatusAsli == eventaturan.StatusBerlangsung || e.StatusAsli == eventaturan.StatusDiperpanjang || !now.Before(e.MulaiAt):
			e.Status = "berjalan"
			e.SisaMenit = int(math.Ceil(e.SelesaiAt.Sub(now).Minutes()))
		default:
			e.Status = "terjadwal"
		}
	}
	return list
}

func (u *eventInfoUsecase) ListPilihan(ctx context.Context, mulai, selesai string) ([]entity.EventPilihan, error) {
	hariIni := u.now().In(eventaturan.WIB).Format("2006-01-02")
	if mulai == "" {
		mulai = hariIni
	}
	if selesai == "" {
		selesai = mulai
	}
	for _, t := range []string{mulai, selesai} {
		if _, err := time.Parse("2006-01-02", t); err != nil {
			return nil, ErrTanggalTidakValid
		}
	}
	if selesai < mulai {
		mulai, selesai = selesai, mulai
	}
	return u.repo.ListPilihan(ctx, mulai, selesai)
}