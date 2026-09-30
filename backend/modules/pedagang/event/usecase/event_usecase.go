package usecase

import (
	"context"
	"time"

	"cfd-backend/modules/pedagang/event/entity"
	"cfd-backend/modules/shared/eventaturan"
)

type EventRepository interface {
	GetPedagang(ctx context.Context, userID string) (pedagangID, kategori string, err error)
	ListEventTersedia(ctx context.Context, pedagangID string) ([]entity.EventTersedia, map[string][]entity.LapakSisa, error)
	Ikut(ctx context.Context, eventID, pedagangID, kategori, userID string) (string, error)
	Batal(ctx context.Context, eventID, pedagangID, userID string) error
	GetKeikutsertaan(ctx context.Context, pesertaID string) (*entity.Keikutsertaan, error)
	ListSaya(ctx context.Context, pedagangID string) ([]entity.Keikutsertaan, error)
}

type EventUsecase interface {
	ListEventTersedia(ctx context.Context, userID string) (*entity.EventTersediaResponse, error)
	Ikut(ctx context.Context, userID, eventID string) (*entity.Keikutsertaan, error)
	Batal(ctx context.Context, userID, eventID string) error
	ListSaya(ctx context.Context, userID string) ([]entity.Keikutsertaan, error)
}

type eventUsecase struct {
	repo EventRepository
	now  func() time.Time
}

func NewEventUsecase(repo EventRepository) EventUsecase {
	return &eventUsecase{repo: repo, now: time.Now}
}

// sisaUntuk: sisa kuota yang bisa diambil pedagang dengan kategori ini.
func sisaUntuk(kategori string, l entity.LapakSisa, lamaDilepas bool) int {
	sisa := 0
	if kategori == eventaturan.KategoriLama {
		sisa = l.SisaLama
	} else {
		sisa = l.SisaBaru
		if lamaDilepas {
			sisa += l.SisaLama
		}
	}
	if sisa < 0 {
		return 0
	}
	return sisa
}

func (u *eventUsecase) ListEventTersedia(ctx context.Context, userID string) (*entity.EventTersediaResponse, error) {
	pedagangID, kategori, err := u.repo.GetPedagang(ctx, userID)
	if err != nil {
		return nil, err
	}
	events, lapak, err := u.repo.ListEventTersedia(ctx, pedagangID)
	if err != nil {
		return nil, err
	}

	now := u.now()
	for i := range events {
		ev := &events[i]
		ev.StatusPendaftaran = eventaturan.StatusPendaftaran(ev.Status, ev.PendaftaranBukaAt, ev.PendaftaranTutupAt, ev.MulaiAt, now)
		ev.KuotaLamaDilepas = eventaturan.KuotaLamaDilepas(ev.LepasKuotaAt, now)
		ev.Lokasi = make([]entity.LokasiRingkas, 0, len(lapak[ev.ID]))
		for _, l := range lapak[ev.ID] {
			sisa := sisaUntuk(kategori, l, ev.KuotaLamaDilepas)
			ev.SisaUntukSaya += sisa
			ev.Lokasi = append(ev.Lokasi, entity.LokasiRingkas{
				NamaKecamatan: l.NamaKecamatan, NamaJalan: l.NamaJalan, NamaRuas: l.NamaRuas, Sisa: sisa,
			})
		}
		ev.BisaIkut = ev.StatusSaya == nil &&
			ev.StatusPendaftaran == eventaturan.PendaftaranDibuka &&
			ev.SisaUntukSaya > 0
	}
	return &entity.EventTersediaResponse{Kategori: kategori, Events: events}, nil
}

func (u *eventUsecase) lengkapi(k *entity.Keikutsertaan) {
	k.BisaBatal = k.Status == eventaturan.PesertaTerdaftar &&
		eventaturan.StatusPendaftaran(k.StatusEvent, k.PendaftaranBukaAt, k.PendaftaranTutupAt, k.MulaiAt, u.now()) == eventaturan.PendaftaranDibuka
}

func (u *eventUsecase) Ikut(ctx context.Context, userID, eventID string) (*entity.Keikutsertaan, error) {
	pedagangID, kategori, err := u.repo.GetPedagang(ctx, userID)
	if err != nil {
		return nil, err
	}
	pesertaID, err := u.repo.Ikut(ctx, eventID, pedagangID, kategori, userID)
	if err != nil {
		return nil, err
	}
	k, err := u.repo.GetKeikutsertaan(ctx, pesertaID)
	if err != nil {
		return nil, err
	}
	u.lengkapi(k)
	return k, nil
}

func (u *eventUsecase) Batal(ctx context.Context, userID, eventID string) error {
	pedagangID, _, err := u.repo.GetPedagang(ctx, userID)
	if err != nil {
		return err
	}
	return u.repo.Batal(ctx, eventID, pedagangID, userID)
}

func (u *eventUsecase) ListSaya(ctx context.Context, userID string) ([]entity.Keikutsertaan, error) {
	pedagangID, _, err := u.repo.GetPedagang(ctx, userID)
	if err != nil {
		return nil, err
	}
	list, err := u.repo.ListSaya(ctx, pedagangID)
	if err != nil {
		return nil, err
	}
	for i := range list {
		u.lengkapi(&list[i])
	}
	return list, nil
}
