package usecase

import (
	"context"
	"time"

	"cfd-backend/modules/pedagang/event/entity"
	"cfd-backend/modules/pedagang/event/repository"
	"cfd-backend/modules/shared/eventaturan"
)

type EventRepository interface {
	GetPedagang(ctx context.Context, userID string) (pedagangID, kategori string, err error)
	ListEventTersedia(ctx context.Context, pedagangID string) ([]entity.EventTersedia, map[string][]entity.LapakSisa, error)
	EventAktif(ctx context.Context, pedagangID string) (*entity.EventAktif, error)
	Ikut(ctx context.Context, eventID, pedagangID, kategori, userID string) (string, error)
	Batal(ctx context.Context, eventID, pedagangID, userID string) error
	GetKeikutsertaan(ctx context.Context, pesertaID string) (*entity.Keikutsertaan, error)
	ListSaya(ctx context.Context, pedagangID string) ([]entity.Keikutsertaan, error)
	ListKandidatCheckout(ctx context.Context, pedagangID string) ([]entity.DataCheckout, error)
	Checkout(ctx context.Context, eventID, pedagangID string, omset int64, userID string, now time.Time) (string, error)
}

type EventUsecase interface {
	ListEventTersedia(ctx context.Context, userID string) (*entity.EventTersediaResponse, error)
	Ikut(ctx context.Context, userID, eventID string) (*entity.Keikutsertaan, error)
	Batal(ctx context.Context, userID, eventID string) error
	ListSaya(ctx context.Context, userID string) ([]entity.Keikutsertaan, error)
	DataCheckout(ctx context.Context, userID string) (*entity.DataCheckout, error)
	Checkout(ctx context.Context, userID, eventID string, omset int64) (*entity.DataCheckout, error)
}

type eventUsecase struct {
	repo EventRepository
	now  func() time.Time
}

func NewEventUsecase(repo EventRepository) EventUsecase {
	return &eventUsecase{repo: repo, now: time.Now}
}

// sisaUntuk: sisa jatah event yang bisa diambil pedagang dengan kategori ini.
func sisaUntuk(kategori string, sisaLama, sisaBaru int, lamaDilepas bool) int {
	sisa := sisaLama
	if kategori != eventaturan.KategoriLama {
		sisa = sisaBaru
		if lamaDilepas && sisaLama > 0 {
			sisa += sisaLama
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

	// Masih terdaftar di event yang belum selesai -> event lain disembunyikan.
	// Daftarnya muncul lagi otomatis begitu event itu selesai atau dibatalkan.
	aktif, err := u.repo.EventAktif(ctx, pedagangID)
	if err != nil {
		return nil, err
	}
	if aktif != nil {
		return &entity.EventTersediaResponse{
			Kategori:   kategori,
			Events:     []entity.EventTersedia{},
			Terkunci:   true,
			EventAktif: aktif,
		}, nil
	}

	events, lapak, err := u.repo.ListEventTersedia(ctx, pedagangID)
	if err != nil {
		return nil, err
	}

	now := u.now()
	for i := range events {
		ev := &events[i]
		ev.StatusPendaftaran = eventaturan.StatusPendaftaran(ev.Status, ev.PendaftaranBukaAt, ev.PendaftaranTutupAt,
			eventaturan.SelesaiAt(ev.Tanggal, ev.JamSelesai), now)
		ev.KuotaLamaDilepas = eventaturan.KuotaLamaDilepas(ev.LepasKuotaAt, now)
		ev.Lokasi = make([]entity.LokasiRingkas, 0, len(lapak[ev.ID]))
		tempatKosong := 0
		for _, l := range lapak[ev.ID] {
			if l.Sisa > 0 {
				tempatKosong += l.Sisa
			}
			ev.Lokasi = append(ev.Lokasi, entity.LokasiRingkas{
				NamaKecamatan: l.NamaKecamatan, NamaJalan: l.NamaJalan, NamaRuas: l.NamaRuas, Sisa: l.Sisa,
			})
		}
		// Sisa untuk pedagang ini = sisa jatahnya di event, tapi tidak lebih
		// dari tempat fisik yang masih kosong.
		ev.SisaUntukSaya = min(sisaUntuk(kategori, ev.SisaLama, ev.SisaBaru, ev.KuotaLamaDilepas), tempatKosong)
		ev.BisaIkut = ev.StatusSaya == nil &&
			ev.StatusPendaftaran == eventaturan.PendaftaranDibuka &&
			ev.SisaUntukSaya > 0
	}
	return &entity.EventTersediaResponse{Kategori: kategori, Events: events}, nil
}

func (u *eventUsecase) lengkapi(k *entity.Keikutsertaan) {
	k.BisaBatal = k.Status == eventaturan.PesertaTerdaftar &&
		eventaturan.StatusPendaftaran(k.StatusEvent, k.PendaftaranBukaAt, k.PendaftaranTutupAt,
			eventaturan.SelesaiAt(k.Tanggal, k.JamSelesai), u.now()) == eventaturan.PendaftaranDibuka
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

// DataCheckout memilih SATU event untuk halaman Check-out:
//  1. check-in di event yang sudah selesai (wajib checkout, paling lama dulu),
//  2. check-in di event yang sedang berjalan (tampil hitung mundur),
//  3. checkout terakhir hari ini (tampil "sudah checkout").
//
// nil = tidak ada yang perlu/pernah di-checkout hari ini.
func (u *eventUsecase) DataCheckout(ctx context.Context, userID string) (*entity.DataCheckout, error) {
	pedagangID, _, err := u.repo.GetPedagang(ctx, userID)
	if err != nil {
		return nil, err
	}
	list, err := u.repo.ListKandidatCheckout(ctx, pedagangID)
	if err != nil {
		return nil, err
	}
	now := u.now()
	for i := range list {
		d := &list[i]
		d.SudahCheckIn = d.CheckInAt != nil
		d.SudahCheckOut = d.Status == eventaturan.PesertaCheckOut
		d.SesiSudahSelesai = eventaturan.EventSudahSelesai(d.StatusEvent, d.JamSelesaiSesi, now)
		d.WajibCheckout = !d.SudahCheckOut && d.SesiSudahSelesai
	}
	for _, cocok := range []func(d *entity.DataCheckout) bool{
		func(d *entity.DataCheckout) bool { return d.WajibCheckout },
		func(d *entity.DataCheckout) bool { return !d.SudahCheckOut },
		func(d *entity.DataCheckout) bool { return d.SudahCheckOut },
	} {
		var pilih *entity.DataCheckout
		for i := range list {
			if !cocok(&list[i]) {
				continue
			}
			// untuk "sudah checkout", ambil yang paling akhir
			if pilih == nil || (list[i].SudahCheckOut && list[i].CheckOutAt != nil && pilih.CheckOutAt != nil && list[i].CheckOutAt.After(*pilih.CheckOutAt)) {
				pilih = &list[i]
			}
		}
		if pilih != nil {
			return pilih, nil
		}
	}
	return nil, nil
}

func (u *eventUsecase) Checkout(ctx context.Context, userID, eventID string, omset int64) (*entity.DataCheckout, error) {
	if omset <= 0 {
		return nil, repository.ErrOmsetTidakValid
	}
	pedagangID, _, err := u.repo.GetPedagang(ctx, userID)
	if err != nil {
		return nil, err
	}
	if _, err := u.repo.Checkout(ctx, eventID, pedagangID, omset, userID, u.now()); err != nil {
		return nil, err
	}
	return u.DataCheckout(ctx, userID)
}