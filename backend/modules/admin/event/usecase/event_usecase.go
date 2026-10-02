package usecase

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"cfd-backend/modules/admin/event/entity"
	"cfd-backend/modules/shared/eventaturan"

	"github.com/google/uuid"
)

var (
	ErrValidasi             = errors.New("data event tidak valid")
	ErrAksiTidakValid       = errors.New("aksi tidak valid")
	ErrBelumAdaTitik        = errors.New("event belum punya titik lokasi, acak lokasi dulu sebelum diterbitkan")
	ErrBukanHariH           = errors.New("event hanya bisa dimulai manual di hari pelaksanaannya")
	ErrJadwalTerkunci       = errors.New("tanggal dan jam event tidak bisa diubah karena sudah ada pedagang yang terdaftar")
	ErrKuotaTurun           = errors.New("pendaftaran sudah dibuka, kuota total hanya boleh dinaikkan")
	ErrKuotaDiBawahTerisi   = errors.New("kuota tidak boleh lebih kecil dari jumlah pedagang yang sudah terdaftar")
	ErrKuotaBelumDiisi      = errors.New("kuota event belum diisi")
	ErrKapasitasDiBawahIsi  = errors.New("kapasitas titik tidak boleh lebih kecil dari jumlah pedagang di titik itu")
	ErrLapakMasihDipakai    = errors.New("titik lokasi ini sudah ada pedagangnya, tidak bisa dihapus")
	ErrEventMasihAdaPeserta = errors.New("event sudah punya peserta, batalkan event dulu sebelum menghapus")
)

// ErrKapasitasKurang: kuota event melebihi jumlah tempat di titik-titiknya.
type ErrKapasitasKurang struct{ Kuota, Kapasitas int }

func (e *ErrKapasitasKurang) Error() string {
	return fmt.Sprintf("kuota event (%d) melebihi kapasitas titik lokasi (%d lapak). Tambah titik lokasi atau turunkan kuota", e.Kuota, e.Kapasitas)
}

// ValidationError membawa pesan spesifik ke controller (400).
type ValidationError struct{ Pesan string }

func (e *ValidationError) Error() string { return e.Pesan }
func (e *ValidationError) Unwrap() error { return ErrValidasi }

func invalid(pesan string) error { return &ValidationError{Pesan: pesan} }

type EventRepository interface {
	ListEvents(ctx context.Context, tanggal *string) ([]entity.Event, error)
	GetEvent(ctx context.Context, id string) (*entity.Event, error)
	CreateEvent(ctx context.Context, in *entity.EventInput, actorID string) (string, error)
	UpdateEvent(ctx context.Context, id string, in *entity.EventInput, sebelum *entity.Event, actorID string) error
	SetStatus(ctx context.Context, id string, dari []string, ke string, jamSelesaiBaru *string, actorID string, alasan *string) error
	DeleteEvent(ctx context.Context, id string, actorID string) error
	CountPesertaAktif(ctx context.Context, eventID string) (int, error)

	ListLapak(ctx context.Context, eventID string) ([]entity.EventLapak, error)
	GetLapak(ctx context.Context, eventID, lapakID string) (*entity.EventLapak, error)
	AcakLokasi(ctx context.Context, eventID string, req *entity.AcakLokasiRequest, actorID string) (int, []entity.EventLapak, error)
	UpdateKapasitas(ctx context.Context, eventID, lapakID string, kapasitas int, sebelum *entity.EventLapak, actorID string) error
	DeleteLapak(ctx context.Context, eventID, lapakID string, sebelum *entity.EventLapak, actorID string) error

	ListPeserta(ctx context.Context, eventID string) ([]entity.Peserta, error)
	NamaWilayah(ctx context.Context, scope string, ids []string) ([]string, error)
	TickStatus(ctx context.Context) error
}

type EventUsecase interface {
	ListEvents(ctx context.Context, tanggal *string) ([]entity.Event, error)
	GetEvent(ctx context.Context, id string) (*entity.EventDetail, error)
	CreateEvent(ctx context.Context, actorID string, req *entity.EventRequest) (*entity.EventDetail, error)
	UpdateEvent(ctx context.Context, actorID, id string, req *entity.EventRequest) (*entity.EventDetail, error)
	UbahStatus(ctx context.Context, actorID, id string, req *entity.UbahStatusRequest) (*entity.EventDetail, error)
	DeleteEvent(ctx context.Context, actorID, id string) error

	AcakLokasi(ctx context.Context, actorID, eventID string, req *entity.AcakLokasiRequest) (*entity.AcakLokasiResponse, error)
	UpdateKapasitas(ctx context.Context, actorID, eventID, lapakID string, req *entity.UpdateKapasitasRequest) (*entity.EventLapak, error)
	DeleteLapak(ctx context.Context, actorID, eventID, lapakID string) error

	ListPeserta(ctx context.Context, eventID string) ([]entity.Peserta, error)
	TickStatus(ctx context.Context) error
}

type eventUsecase struct {
	repo EventRepository
	now  func() time.Time
}

func NewEventUsecase(repo EventRepository) EventUsecase {
	return &eventUsecase{repo: repo, now: time.Now}
}

// lengkapi mengisi field turunan yang tidak disimpan di DB.
func (u *eventUsecase) lengkapi(ev *entity.Event) {
	now := u.now()
	ev.StatusPendaftaran = eventaturan.StatusPendaftaran(ev.Status, ev.PendaftaranBukaAt, ev.PendaftaranTutupAt, ev.MulaiAt, now)
	ev.KuotaLamaDilepas = eventaturan.KuotaLamaDilepas(ev.LepasKuotaAt, now)
}

func (u *eventUsecase) ListEvents(ctx context.Context, tanggal *string) ([]entity.Event, error) {
	if tanggal != nil {
		if _, err := time.Parse("2006-01-02", *tanggal); err != nil {
			return nil, invalid("format tanggal harus YYYY-MM-DD")
		}
	}
	list, err := u.repo.ListEvents(ctx, tanggal)
	if err != nil {
		return nil, err
	}
	for i := range list {
		u.lengkapi(&list[i])
	}
	return list, nil
}

func (u *eventUsecase) GetEvent(ctx context.Context, id string) (*entity.EventDetail, error) {
	ev, err := u.repo.GetEvent(ctx, id)
	if err != nil {
		return nil, err
	}
	u.lengkapi(ev)
	lapak, err := u.repo.ListLapak(ctx, id)
	if err != nil {
		return nil, err
	}
	return &entity.EventDetail{Event: *ev, Lapak: lapak}, nil
}

// parseWaktu menerima RFC3339 atau "YYYY-MM-DDTHH:MM" (dianggap WIB).
func parseWaktu(s *string, nama string) (*time.Time, error) {
	if s == nil || strings.TrimSpace(*s) == "" {
		return nil, nil
	}
	v := strings.TrimSpace(*s)
	if t, err := time.Parse(time.RFC3339, v); err == nil {
		return &t, nil
	}
	for _, layout := range []string{"2006-01-02T15:04", "2006-01-02T15:04:05", "2006-01-02 15:04"} {
		if t, err := time.ParseInLocation(layout, v, eventaturan.WIB); err == nil {
			return &t, nil
		}
	}
	return nil, invalid(nama + " harus berformat tanggal-waktu, mis. 2026-10-03T18:00")
}

func parseJam(s, nama string) (time.Time, error) {
	for _, layout := range []string{"15:04", "15:04:05"} {
		if t, err := time.Parse(layout, strings.TrimSpace(s)); err == nil {
			return t, nil
		}
	}
	return time.Time{}, invalid(nama + " harus berformat HH:MM")
}

func (u *eventUsecase) validasiEvent(req *entity.EventRequest) (*entity.EventInput, error) {
	nama := strings.TrimSpace(req.Nama)
	if nama == "" {
		return nil, invalid("nama event wajib diisi")
	}
	if len(nama) > 150 {
		return nil, invalid("nama event maksimal 150 karakter")
	}
	tgl, err := time.ParseInLocation("2006-01-02", strings.TrimSpace(req.Tanggal), eventaturan.WIB)
	if err != nil {
		return nil, invalid("tanggal wajib diisi dengan format YYYY-MM-DD")
	}
	mulai, err := parseJam(req.JamMulai, "jam mulai")
	if err != nil {
		return nil, err
	}
	selesai, err := parseJam(req.JamSelesai, "jam selesai")
	if err != nil {
		return nil, err
	}
	if !selesai.After(mulai) {
		return nil, invalid("jam selesai harus setelah jam mulai")
	}
	buka, err := parseWaktu(req.PendaftaranBukaAt, "waktu buka pendaftaran")
	if err != nil {
		return nil, err
	}
	tutup, err := parseWaktu(req.PendaftaranTutupAt, "waktu tutup pendaftaran")
	if err != nil {
		return nil, err
	}
	lepas, err := parseWaktu(req.LepasKuotaAt, "waktu lepas kuota lama")
	if err != nil {
		return nil, err
	}

	mulaiAt := time.Date(tgl.Year(), tgl.Month(), tgl.Day(), mulai.Hour(), mulai.Minute(), 0, 0, eventaturan.WIB)
	if buka != nil && tutup != nil && !tutup.After(*buka) {
		return nil, invalid("waktu tutup pendaftaran harus setelah waktu buka")
	}
	if tutup != nil && tutup.After(mulaiAt) {
		return nil, invalid("pendaftaran harus sudah ditutup sebelum event dimulai")
	}
	if lepas != nil {
		if buka != nil && lepas.Before(*buka) {
			return nil, invalid("waktu lepas kuota lama tidak boleh sebelum pendaftaran dibuka")
		}
		if tutup != nil && lepas.After(*tutup) {
			return nil, invalid("waktu lepas kuota lama harus sebelum pendaftaran ditutup")
		}
	}

	if req.KuotaTotal < 1 {
		return nil, invalid("kuota event wajib diisi, minimal 1")
	}
	if req.KuotaLama < 0 || req.KuotaLama > req.KuotaTotal {
		return nil, invalid("kuota pedagang lama harus antara 0 dan kuota event")
	}

	var ket *string
	if req.Keterangan != nil && strings.TrimSpace(*req.Keterangan) != "" {
		k := strings.TrimSpace(*req.Keterangan)
		ket = &k
	}
	return &entity.EventInput{
		Nama:               nama,
		Tanggal:            tgl.Format("2006-01-02"),
		JamMulai:           mulai.Format("15:04"),
		JamSelesai:         selesai.Format("15:04"),
		PendaftaranBukaAt:  buka,
		PendaftaranTutupAt: tutup,
		LepasKuotaAt:       lepas,
		Keterangan:         ket,
		KuotaTotal:         req.KuotaTotal,
		KuotaLama:          req.KuotaLama,
	}, nil
}

func (u *eventUsecase) CreateEvent(ctx context.Context, actorID string, req *entity.EventRequest) (*entity.EventDetail, error) {
	in, err := u.validasiEvent(req)
	if err != nil {
		return nil, err
	}
	id, err := u.repo.CreateEvent(ctx, in, actorID)
	if err != nil {
		return nil, err
	}
	return u.GetEvent(ctx, id)
}

func (u *eventUsecase) UpdateEvent(ctx context.Context, actorID, id string, req *entity.EventRequest) (*entity.EventDetail, error) {
	in, err := u.validasiEvent(req)
	if err != nil {
		return nil, err
	}
	sebelum, err := u.repo.GetEvent(ctx, id)
	if err != nil {
		return nil, err
	}
	// Setelah ada peserta, tanggal & jam dikunci: pedagang sudah memilih
	// event ini berdasarkan jadwalnya, dan cek bentrok jadwal antar event
	// bisa jadi tidak berlaku lagi.
	jadwalBerubah := in.Tanggal != sebelum.Tanggal || in.JamMulai != sebelum.JamMulai || in.JamSelesai != sebelum.JamSelesai
	if jadwalBerubah {
		n, err := u.repo.CountPesertaAktif(ctx, id)
		if err != nil {
			return nil, err
		}
		if n > 0 {
			return nil, ErrJadwalTerkunci
		}
	}
	// Aturan kuota per event:
	//  - tidak boleh di bawah pedagang yang sudah terdaftar (per kategori jatah);
	//  - setelah pendaftaran dibuka, kuota total hanya boleh naik;
	//  - kalau event sudah terbit, kuota tidak boleh melebihi kapasitas titik.
	u.lengkapi(sebelum)
	if in.KuotaLama < sebelum.TerisiLama || in.KuotaTotal-in.KuotaLama < sebelum.TerisiBaru {
		return nil, ErrKuotaDiBawahTerisi
	}
	if sebelum.StatusPendaftaran != eventaturan.PendaftaranBelumDibuka && in.KuotaTotal < sebelum.KuotaTotal {
		return nil, ErrKuotaTurun
	}
	if sebelum.Status == eventaturan.StatusTerjadwal && in.KuotaTotal > sebelum.KapasitasTitik {
		return nil, &ErrKapasitasKurang{Kuota: in.KuotaTotal, Kapasitas: sebelum.KapasitasTitik}
	}
	if err := u.repo.UpdateEvent(ctx, id, in, sebelum, actorID); err != nil {
		return nil, err
	}
	return u.GetEvent(ctx, id)
}

func (u *eventUsecase) UbahStatus(ctx context.Context, actorID, id string, req *entity.UbahStatusRequest) (*entity.EventDetail, error) {
	ev, err := u.repo.GetEvent(ctx, id)
	if err != nil {
		return nil, err
	}

	var dari []string
	var ke string
	var jamSelesai *string

	switch req.Aksi {
	case entity.AksiTerbitkan:
		if ev.JumlahTitik == 0 {
			return nil, ErrBelumAdaTitik
		}
		if ev.KuotaTotal < 1 {
			return nil, ErrKuotaBelumDiisi
		}
		if ev.KuotaTotal > ev.KapasitasTitik {
			return nil, &ErrKapasitasKurang{Kuota: ev.KuotaTotal, Kapasitas: ev.KapasitasTitik}
		}
		dari, ke = []string{eventaturan.StatusDraft}, eventaturan.StatusTerjadwal
	case entity.AksiMulai:
		if ev.Tanggal != u.now().In(eventaturan.WIB).Format("2006-01-02") {
			return nil, ErrBukanHariH
		}
		dari, ke = []string{eventaturan.StatusTerjadwal}, eventaturan.StatusBerlangsung
	case entity.AksiPerpanjang:
		if req.JamSelesai == nil {
			return nil, invalid("jam selesai baru wajib diisi untuk memperpanjang event")
		}
		baru, err := parseJam(*req.JamSelesai, "jam selesai baru")
		if err != nil {
			return nil, err
		}
		lama, _ := parseJam(ev.JamSelesai, "jam selesai")
		if !baru.After(lama) {
			return nil, invalid("jam selesai baru harus setelah jam selesai sekarang (" + ev.JamSelesai + ")")
		}
		j := baru.Format("15:04")
		jamSelesai = &j
		dari, ke = []string{eventaturan.StatusBerlangsung, eventaturan.StatusDiperpanjang}, eventaturan.StatusDiperpanjang
	case entity.AksiAkhiri:
		dari, ke = []string{eventaturan.StatusBerlangsung, eventaturan.StatusDiperpanjang}, eventaturan.StatusDiakhiriAwal
	case entity.AksiBatalkan:
		dari, ke = []string{eventaturan.StatusDraft, eventaturan.StatusTerjadwal}, eventaturan.StatusDibatalkan
	default:
		return nil, ErrAksiTidakValid
	}

	if err := u.repo.SetStatus(ctx, id, dari, ke, jamSelesai, actorID, req.Alasan); err != nil {
		return nil, err
	}
	return u.GetEvent(ctx, id)
}

func (u *eventUsecase) DeleteEvent(ctx context.Context, actorID, id string) error {
	ev, err := u.repo.GetEvent(ctx, id)
	if err != nil {
		return err
	}
	if ev.Status != eventaturan.StatusDibatalkan {
		n, err := u.repo.CountPesertaAktif(ctx, id)
		if err != nil {
			return err
		}
		if n > 0 {
			return ErrEventMasihAdaPeserta
		}
	}
	return u.repo.DeleteEvent(ctx, id, actorID)
}

func (u *eventUsecase) AcakLokasi(ctx context.Context, actorID, eventID string, req *entity.AcakLokasiRequest) (*entity.AcakLokasiResponse, error) {
	if req.JumlahTitik < 0 {
		return nil, invalid("jumlah titik tidak boleh negatif")
	}
	ids, err := rapikanWilayah(req)
	if err != nil {
		return nil, err
	}
	req.WilayahIDs = ids

	kandidat, ditambahkan, err := u.repo.AcakLokasi(ctx, eventID, req, actorID)
	if err != nil {
		return nil, err
	}

	// Label cuma pelengkap tampilan; gagal ambil nama tidak menggagalkan
	// hasil acak yang sudah tersimpan.
	label := "Se-Surabaya"
	if req.Scope != entity.ScopeKota {
		label = req.Scope
		if nama, err := u.repo.NamaWilayah(ctx, req.Scope, ids); err == nil && len(nama) > 0 {
			label = gabungNama(nama)
		}
	}
	return &entity.AcakLokasiResponse{ScopeLabel: label, JumlahKandidat: kandidat, Ditambahkan: ditambahkan}, nil
}

const maksWilayahPerAcak = 200

// rapikanWilayah menggabungkan field jamak dan tunggal sesuai scope,
// membuang yang kosong/duplikat, dan memastikan formatnya UUID.
func rapikanWilayah(req *entity.AcakLokasiRequest) ([]string, error) {
	var mentah []string
	switch req.Scope {
	case entity.ScopeKota:
		return nil, nil
	case entity.ScopeKecamatan:
		mentah = append(mentah, req.KecamatanIDs...)
		if req.KecamatanID != nil {
			mentah = append(mentah, *req.KecamatanID)
		}
	case entity.ScopeJalan:
		mentah = append(mentah, req.JalanIDs...)
		if req.JalanID != nil {
			mentah = append(mentah, *req.JalanID)
		}
	case entity.ScopeRuas:
		mentah = append(mentah, req.RuasIDs...)
	default:
		return nil, invalid("cakupan harus kota, kecamatan, jalan, atau ruas")
	}

	sudah := map[string]bool{}
	ids := make([]string, 0, len(mentah))
	for _, m := range mentah {
		m = strings.TrimSpace(m)
		if m == "" {
			continue
		}
		id, err := uuid.Parse(m)
		if err != nil {
			return nil, invalid("id wilayah tidak valid: " + m)
		}
		if s := id.String(); !sudah[s] {
			sudah[s] = true
			ids = append(ids, s)
		}
	}
	if len(ids) == 0 {
		return nil, invalid("pilih minimal satu " + req.Scope + " untuk diacak")
	}
	if len(ids) > maksWilayahPerAcak {
		return nil, invalid("terlalu banyak wilayah dalam sekali acak")
	}
	return ids, nil
}

// gabungNama: "Kec. Genteng, Kec. Sukolilo, dan 2 lainnya".
func gabungNama(nama []string) string {
	if len(nama) <= 3 {
		return strings.Join(nama, ", ")
	}
	return strings.Join(nama[:3], ", ") + ", dan " + strconv.Itoa(len(nama)-3) + " lainnya"
}

// UpdateKapasitas: ubah kapasitas fisik 1 titik. Tidak boleh di bawah
// jumlah pedagang di titik itu / nomor terbesar yang dipakai (nomor stan =
// 1..kapasitas), dan kalau event sudah terbit total kapasitas tidak boleh
// jadi lebih kecil dari kuota event.
func (u *eventUsecase) UpdateKapasitas(ctx context.Context, actorID, eventID, lapakID string, req *entity.UpdateKapasitasRequest) (*entity.EventLapak, error) {
	if req.Kapasitas < 1 {
		return nil, invalid("kapasitas minimal 1, hapus titiknya kalau tidak dipakai")
	}
	ev, err := u.repo.GetEvent(ctx, eventID)
	if err != nil {
		return nil, err
	}
	if ev.Status != eventaturan.StatusDraft && ev.Status != eventaturan.StatusTerjadwal {
		return nil, ErrKuotaTerkunci
	}
	l, err := u.repo.GetLapak(ctx, eventID, lapakID)
	if err != nil {
		return nil, err
	}
	if req.Kapasitas < l.Terisi || req.Kapasitas < l.NomorTerbesar {
		return nil, ErrKapasitasDiBawahIsi
	}
	if ev.Status == eventaturan.StatusTerjadwal {
		baru := ev.KapasitasTitik - l.Kapasitas + req.Kapasitas
		if baru < ev.KuotaTotal {
			return nil, &ErrKapasitasKurang{Kuota: ev.KuotaTotal, Kapasitas: baru}
		}
	}
	if err := u.repo.UpdateKapasitas(ctx, eventID, lapakID, req.Kapasitas, l, actorID); err != nil {
		return nil, err
	}
	return u.repo.GetLapak(ctx, eventID, lapakID)
}

var ErrKuotaTerkunci = errors.New("event sudah berjalan atau selesai, titik lokasi dan kuota terkunci")

func (u *eventUsecase) DeleteLapak(ctx context.Context, actorID, eventID, lapakID string) error {
	ev, err := u.repo.GetEvent(ctx, eventID)
	if err != nil {
		return err
	}
	if ev.Status != eventaturan.StatusDraft && ev.Status != eventaturan.StatusTerjadwal {
		return ErrKuotaTerkunci
	}
	l, err := u.repo.GetLapak(ctx, eventID, lapakID)
	if err != nil {
		return err
	}
	if l.Terisi > 0 {
		return ErrLapakMasihDipakai
	}
	if ev.Status == eventaturan.StatusTerjadwal && ev.KapasitasTitik-l.Kapasitas < ev.KuotaTotal {
		return &ErrKapasitasKurang{Kuota: ev.KuotaTotal, Kapasitas: ev.KapasitasTitik - l.Kapasitas}
	}
	return u.repo.DeleteLapak(ctx, eventID, lapakID, l, actorID)
}

func (u *eventUsecase) ListPeserta(ctx context.Context, eventID string) ([]entity.Peserta, error) {
	if _, err := u.repo.GetEvent(ctx, eventID); err != nil {
		return nil, err
	}
	return u.repo.ListPeserta(ctx, eventID)
}

func (u *eventUsecase) TickStatus(ctx context.Context) error {
	return u.repo.TickStatus(ctx)
}