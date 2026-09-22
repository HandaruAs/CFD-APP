package usecase

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"strings"
	"time"

	"cfd-backend/modules/petugas/manajemen-lapak/entity"
	"github.com/google/uuid"
)

var (
	ErrKuotaJalanLebihDariEvent = errors.New("total kuota jalan yang dipilih melebihi kuota total event")
	ErrKuotaRuasLebihDariJalan  = errors.New("total kuota ruas melebihi kuota jalan ini di event yang aktif")
	ErrJalanTidakDitemukan      = errors.New("jalan tidak ditemukan")
	ErrRuasTidakDitemukan       = errors.New("ruas tidak ditemukan")
	// ErrKuotaLebihDariKapasitas -- kuota yang dialokasikan ke sebuah
	// jalan (baik pas bikin event maupun assign belakangan) gak boleh
	// lebih besar dari kapasitas fisik jalan itu sendiri
	// (master_jalan.kapasitas). Sebelumnya cuma dicek total kuota semua
	// jalan vs kuota total event, jadi 1 jalan bisa dikasih kuota lebih
	// dari kapasitasnya asal totalnya masih di bawah kuota event.
	ErrKuotaLebihDariKapasitas = errors.New("kuota melebihi kapasitas jalan ini")
	// ErrJalanDuplikat -- satu jalan yang sama gak boleh dikirim dua kali
	// dalam satu request bikin event. Kalau dibiarkan, kuotanya kehitung
	// dobel pas validasi tapi cuma kesimpan sekali (ON CONFLICT DO UPDATE
	// di repo), jadi kuota tersimpan gak sama dengan yang divalidasi.
	ErrJalanDuplikat = errors.New("ada jalan yang dipilih lebih dari satu kali")
	// ErrJalanBelumDiikutkanEvent -- jalannya ADA, tapi belum pernah
	// di-assign kuota ke event yang dimaksud (beda kasus dari
	// ErrJalanTidakDitemukan).
	ErrJalanBelumDiikutkanEvent = errors.New("jalan ini belum diikutkan ke event ini")
)

type ManajemenLapakRepository interface {
	GetWilayahLengkap(ctx context.Context) ([]entity.KecamatanLengkapData, error)

	CreateEvent(ctx context.Context, userID string, req *entity.CreateEventRequest) (string, error)
	ListEvents(ctx context.Context) ([]entity.EventDTO, error)
	SetEventAktif(ctx context.Context, eventID string, aktif bool) error
	GetKuotaEvent(ctx context.Context, eventID string) (*entity.KuotaEventDTO, error)
	GetActiveEventID(ctx context.Context) (string, error)
	// GetKuotaTotalEvent -- kuota_total 1 event (pengganti ListEvents yang
	// dulu dipanggil cuma buat baca satu angka).
	GetKuotaTotalEvent(ctx context.Context, eventID string) (int, error)
	KuotaJalanUntukEvent(ctx context.Context, jalanID, eventID string) (int, error)

	JalanExists(ctx context.Context, jalanID string) (bool, error)
	// GetJalanKapasitas -- kapasitas dasar 1 jalan (master_jalan.kapasitas),
	// dipakai buat validasi kuota di CreateEvent & AssignJalanKeEventAktif.
	GetJalanKapasitas(ctx context.Context, jalanID string) (int, error)
	// GetRuasJalanID -- ruas ID ini kepunyaan jalan mana.
	GetRuasJalanID(ctx context.Context, ruasID string) (string, error)
	// GetRuasByJalan -- ambil SEMUA ruas milik 1 jalan (dipakai buat
	// nghitung ulang nomorMulai/nomorSelesai tiap kali ada perubahan).
	GetRuasByJalan(ctx context.Context, jalanID string) ([]entity.RuasData, error)
	// ReplaceRuasJalan -- ganti SELURUH daftar ruas milik 1 jalan
	// sekaligus (dipakai setelah recompute nomor di usecase).
	ReplaceRuasJalan(ctx context.Context, jalanID string, list []entity.RuasData) error

	GetPedagangLama(ctx context.Context, filter entity.PedagangLamaFilter) ([]entity.PedagangLamaItem, int, error)
	CreatePedagangManual(ctx context.Context, req *entity.CreatePedagangRequest) (*entity.CreatePedagangResult, error)
	ImportPedagangBatch(ctx context.Context, rows []entity.CreatePedagangRequest) (berhasil, gagal int, errs []string)

	CreateKecamatan(ctx context.Context, namaKecamatan string) (string, error)
	CreateJalanBaru(ctx context.Context, req *entity.CreateJalanBaruRequest) (string, error)
	// SumKuotaRuas -- total kuota semua ruas 1 jalan, dipakai buat
	// validasi batas-bawah pas UpdateJalanBaru (kapasitas baru gak
	// boleh diturunkan sampai di bawah ini).
	SumKuotaRuas(ctx context.Context, jalanID string) (int, error)
	UpdateJalanBaru(ctx context.Context, jalanID string, req *entity.UpdateJalanBaruRequest) error

	DeleteEvent(ctx context.Context, eventID string) error
	DeleteKecamatan(ctx context.Context, kecamatanID string) error
	DeleteJalanBaru(ctx context.Context, jalanID string) error

	AssignJalanKeEventAktif(ctx context.Context, eventID, jalanID string, kuota int) error
	SumKuotaJalanEvent(ctx context.Context, eventID string, kecualiJalanID string) (int, error)

	// GetTerisiJalanEvent -- terisi 1 jalan di 1 event tertentu, dan
	// apakah jalan itu memang sudah diikutkan ke event ini.
	GetTerisiJalanEvent(ctx context.Context, jalanID, eventID string) (terisi int, ada bool, err error)
	// UpdateKuotaJalanEvent -- edit kuota jalan yang sudah diikutkan ke
	// SEBUAH event tertentu, gak peduli event itu aktif atau belum.
	UpdateKuotaJalanEvent(ctx context.Context, eventID, jalanID string, kuota int) error
}

type ManajemenLapakUsecase interface {
	GetWilayahLengkap(ctx context.Context) ([]entity.KecamatanLengkapData, error)

	CreateEvent(ctx context.Context, userID string, req *entity.CreateEventRequest) (string, error)
	ListEvents(ctx context.Context) ([]entity.EventDTO, error)
	SetEventAktif(ctx context.Context, eventID string, aktif bool) error
	GetKuotaEvent(ctx context.Context, eventID string) (*entity.KuotaEventDTO, error)
	DeleteEvent(ctx context.Context, eventID string) error

	CreateRuas(ctx context.Context, req *entity.CreateRuasRequest) (string, error)
	UpdateRuas(ctx context.Context, id string, req *entity.UpdateRuasRequest) error
	DeleteRuas(ctx context.Context, id string) error

	GetPedagangLama(ctx context.Context, filter entity.PedagangLamaFilter) (*entity.PedagangLamaResponse, error)
	CreatePedagang(ctx context.Context, req *entity.CreatePedagangRequest) (*entity.CreatePedagangResult, error)
	ImportPedagang(ctx context.Context, rows []entity.CreatePedagangRequest) (*entity.ImportPedagangResult, error)

	CreateKecamatan(ctx context.Context, namaKecamatan string) (string, error)
	CreateJalanBaru(ctx context.Context, req *entity.CreateJalanBaruRequest) (string, error)
	// UpdateJalanBaru -- edit kode/nama/kapasitas jalan, kapan aja (event
	// aktif atau tidak, sama kayak ruas), asal kapasitas barunya gak
	// diturunkan sampai di bawah kuota yang udah kepakai.
	UpdateJalanBaru(ctx context.Context, jalanID string, req *entity.UpdateJalanBaruRequest) error
	DeleteKecamatan(ctx context.Context, kecamatanID string) error
	DeleteJalanBaru(ctx context.Context, jalanID string) error

	AssignJalanKeEventAktif(ctx context.Context, jalanID string, req *entity.AssignJalanEventRequest) error
	// UpdateKuotaJalanEvent -- versi "gak perlu event aktif" dari
	// AssignJalanKeEventAktif: edit kuota jalan yang sudah tergabung ke
	// event manapun (aktif atau belum) berdasarkan eventID eksplisit.
	UpdateKuotaJalanEvent(ctx context.Context, eventID, jalanID string, req *entity.AssignJalanEventRequest) error
}

type manajemenLapakUsecase struct {
	repo ManajemenLapakRepository
}

func NewManajemenLapakUsecase(repo ManajemenLapakRepository) ManajemenLapakUsecase {
	return &manajemenLapakUsecase{repo: repo}
}

func (u *manajemenLapakUsecase) GetWilayahLengkap(ctx context.Context) ([]entity.KecamatanLengkapData, error) {
	return u.repo.GetWilayahLengkap(ctx)
}

// validasiWaktuEvent -- jaga urutan waktu tetap masuk akal. Sebelumnya
// gak ada pengecekan sama sekali di FE maupun BE, jadi event bisa
// tersimpan dengan jam selesai lebih awal dari jam mulai, atau periode
// pendaftaran yang dibuka setelah ditutup / setelah eventnya lewat.
func validasiWaktuEvent(req *entity.CreateEventRequest) error {
	if req.JamMulai >= req.JamSelesai {
		return fmt.Errorf("jam selesai harus lebih besar dari jam mulai")
	}

	mulai, err := time.Parse(time.RFC3339, req.PendaftaranMulai)
	if err != nil {
		return fmt.Errorf("format pendaftaranMulai tidak valid")
	}
	selesai, err := time.Parse(time.RFC3339, req.PendaftaranSelesai)
	if err != nil {
		return fmt.Errorf("format pendaftaranSelesai tidak valid")
	}
	if !selesai.After(mulai) {
		return fmt.Errorf("pendaftaran selesai harus setelah pendaftaran mulai")
	}

	tanggalEvent, err := time.Parse("2006-01-02", req.Tanggal)
	if err != nil {
		return fmt.Errorf("format tanggal event tidak valid (pakai YYYY-MM-DD)")
	}
	// Pendaftaran boleh ditutup di hari-H, tapi gak boleh setelah
	// eventnya lewat.
	batasAkhir := tanggalEvent.AddDate(0, 0, 1)
	if !selesai.Before(batasAkhir) {
		return fmt.Errorf("periode pendaftaran harus selesai paling lambat di hari event")
	}
	return nil
}

// CreateEvent -- checklist #2: tambah event beserta jalan+kuotanya & jadwal
// registrasi. checklist #3 (bagian event): total kuota jalan yang dipilih
// gak boleh lebih besar dari kuota total event.
func (u *manajemenLapakUsecase) CreateEvent(ctx context.Context, userID string, req *entity.CreateEventRequest) (string, error) {
	if err := validasiWaktuEvent(req); err != nil {
		return "", err
	}
	if req.KuotaTotal <= 0 {
		return "", fmt.Errorf("kuota total event harus lebih dari 0")
	}
	if len(req.Jalan) == 0 {
		return "", fmt.Errorf("pilih minimal 1 jalan untuk event ini")
	}

	sudahDipilih := map[string]bool{}
	totalJalan := 0
	for _, j := range req.Jalan {
		if sudahDipilih[j.JalanID] {
			return "", fmt.Errorf("%w: %s", ErrJalanDuplikat, j.JalanID)
		}
		sudahDipilih[j.JalanID] = true

		if j.Kuota <= 0 {
			return "", fmt.Errorf("kuota tiap jalan harus lebih dari 0")
		}

		ada, err := u.repo.JalanExists(ctx, j.JalanID)
		if err != nil {
			return "", err
		}
		if !ada {
			return "", fmt.Errorf("%w: %s", ErrJalanTidakDitemukan, j.JalanID)
		}
		kapasitas, err := u.repo.GetJalanKapasitas(ctx, j.JalanID)
		if err != nil {
			return "", err
		}
		if j.Kuota > kapasitas {
			return "", fmt.Errorf("%w: jalan %s (kuota %d, kapasitas %d)", ErrKuotaLebihDariKapasitas, j.JalanID, j.Kuota, kapasitas)
		}
		totalJalan += j.Kuota
	}
	if totalJalan > req.KuotaTotal {
		return "", ErrKuotaJalanLebihDariEvent
	}
	return u.repo.CreateEvent(ctx, userID, req)
}

func (u *manajemenLapakUsecase) ListEvents(ctx context.Context) ([]entity.EventDTO, error) {
	return u.repo.ListEvents(ctx)
}

func (u *manajemenLapakUsecase) SetEventAktif(ctx context.Context, eventID string, aktif bool) error {
	return u.repo.SetEventAktif(ctx, eventID, aktif)
}

func (u *manajemenLapakUsecase) GetKuotaEvent(ctx context.Context, eventID string) (*entity.KuotaEventDTO, error) {
	return u.repo.GetKuotaEvent(ctx, eventID)
}

// ============================================================
// RUAS -- checklist #3, #7, #8.
//
// Konsep (ngikutin referensi Manajemen CFD): petugas cuma isi "Nama
// Ruas" & "Kuota" per ruas -- Urutan gak lagi diinput manual (dianggap
// nampilin info yang sama aja dari sisi petugas; ujung-ujungnya yang
// kepake cuma Status Lama/Baru per ruas), ditentukan otomatis di sini
// (urutan terakhir + 1 tiap nambah ruas baru, gak berubah kalau cuma
// ngedit ruas yang sudah ada). nomorMulai/nomorSelesai TIDAK bisa
// diisi manual, tapi dihitung ulang otomatis di sini setiap kali ada
// ruas ditambah/diubah/dihapus, berdasarkan urutan (ruas urutan 1
// dapet nomor 1..kuota1, urutan 2 lanjut kuota1+1..kuota1+kuota2,
// dst).
// ============================================================

// validasiRuasInput -- tag `validate:"..."` di entity gak pernah
// dijalankan (Fiber belum dikasih StructValidator di main.go), jadi
// batasan dasarnya dicek manual di sini.
func validasiRuasInput(namaRuas string, kuota int) error {
	if strings.TrimSpace(namaRuas) == "" {
		return fmt.Errorf("nama ruas wajib diisi")
	}
	if kuota <= 0 {
		return fmt.Errorf("kuota ruas harus lebih dari 0")
	}
	return nil
}

func (u *manajemenLapakUsecase) CreateRuas(ctx context.Context, req *entity.CreateRuasRequest) (string, error) {
	if err := validasiRuasInput(req.NamaRuas, req.Kuota); err != nil {
		return "", err
	}
	ada, err := u.repo.JalanExists(ctx, req.JalanID)
	if err != nil {
		return "", err
	}
	if !ada {
		return "", ErrJalanTidakDitemukan
	}

	list, err := u.repo.GetRuasByJalan(ctx, req.JalanID)
	if err != nil {
		return "", err
	}

	// Urutan otomatis = urutan terbesar yang ada sekarang + 1 (ruas baru
	// selalu ditaruh paling belakang urutannya).
	urutanBaru := 1
	for _, ru := range list {
		if ru.Urutan >= urutanBaru {
			urutanBaru = ru.Urutan + 1
		}
	}

	newID := uuid.NewString()
	list = append(list, entity.RuasData{
		ID: newID, NamaRuas: req.NamaRuas, Urutan: urutanBaru,
		Kuota: req.Kuota,
	})

	if err := u.validasiDanSimpanUlangRuas(ctx, req.JalanID, list, nil); err != nil {
		return "", err
	}
	return newID, nil
}

func (u *manajemenLapakUsecase) UpdateRuas(ctx context.Context, id string, req *entity.UpdateRuasRequest) error {
	if err := validasiRuasInput(req.NamaRuas, req.Kuota); err != nil {
		return err
	}
	jalanID, err := u.repo.GetRuasJalanID(ctx, id)
	if err != nil {
		return err
	}

	list, err := u.repo.GetRuasByJalan(ctx, jalanID)
	if err != nil {
		return err
	}

	ditemukan := false
	for i := range list {
		if list[i].ID == id {
			list[i].NamaRuas = req.NamaRuas
			// Urutan SENGAJA gak disentuh -- tetap pakai nilai lama,
			// gak lagi bisa diedit manual lewat form ini.
			list[i].Kuota = req.Kuota
			ditemukan = true
			break
		}
	}
	if !ditemukan {
		return ErrRuasTidakDitemukan
	}

	return u.validasiDanSimpanUlangRuas(ctx, jalanID, list, nil)
}

func (u *manajemenLapakUsecase) DeleteRuas(ctx context.Context, id string) error {
	jalanID, err := u.repo.GetRuasJalanID(ctx, id)
	if err != nil {
		return err
	}

	list, err := u.repo.GetRuasByJalan(ctx, jalanID)
	if err != nil {
		return err
	}

	sisa := make([]entity.RuasData, 0, len(list))
	ditemukan := false
	for _, ru := range list {
		if ru.ID == id {
			ditemukan = true
			continue
		}
		sisa = append(sisa, ru)
	}
	if !ditemukan {
		return ErrRuasTidakDitemukan
	}

	return u.validasiDanSimpanUlangRuas(ctx, jalanID, sisa, nil)
}

// validasiDanSimpanUlangRuas -- inti dari fitur "urutan otomatis":
// 1) validasi total kuota semua ruas gak lebih dari batas kuota jalan
//    itu, 2) urutkan berdasarkan Urutan (stabil, jadi kalau ada urutan
//    yang sama, yang lebih dulu dibuat tetap duluan), 3) hitung ulang
//    NomorMulai/NomorSelesai tiap ruas secara berjalan (kumulatif),
//    4) simpan seluruh daftar sekaligus.
//
// Batas kuota totalnya: kalau jalan ini SUDAH diikutkan ke event yang
// lagi aktif, pakai kuota jalan itu di event tsb (biar ruas gak
// melebihi apa yang dialokasikan buat event yang sedang jalan).
// Sebelumnya, kalau belum ada event aktif SAMA SEKALI (atau jalan ini
// belum diikutkan ke event aktif), ruas gak bisa diatur sama sekali --
// padahal petugas perlu bisa nyiapin/nyusun ruas jalan dari awal
// SEBELUM event-nya diaktifkan. Sekarang batasnya jatuh balik ke
// kapasitas dasar jalan (master_jalan.kapasitas) buat kasus itu.
func (u *manajemenLapakUsecase) validasiDanSimpanUlangRuas(ctx context.Context, jalanID string, list []entity.RuasData, _ *string) error {
	batasKuota, err := u.repo.GetJalanKapasitas(ctx, jalanID)
	if err != nil {
		return err
	}
	if eventID, errAktif := u.repo.GetActiveEventID(ctx); errAktif == nil {
		if kuotaJalan, errKuota := u.repo.KuotaJalanUntukEvent(ctx, jalanID, eventID); errKuota == nil && kuotaJalan > 0 {
			batasKuota = kuotaJalan
		}
	}

	totalKuota := 0
	for _, ru := range list {
		totalKuota += ru.Kuota
	}
	if totalKuota > batasKuota {
		return ErrKuotaRuasLebihDariJalan
	}

	sort.SliceStable(list, func(i, j int) bool {
		return list[i].Urutan < list[j].Urutan
	})

	nomorBerjalan := 1
	for i := range list {
		list[i].NomorMulai = nomorBerjalan
		list[i].NomorSelesai = nomorBerjalan + list[i].Kuota - 1
		nomorBerjalan = list[i].NomorSelesai + 1
	}

	return u.repo.ReplaceRuasJalan(ctx, jalanID, list)
}

func (u *manajemenLapakUsecase) GetPedagangLama(ctx context.Context, filter entity.PedagangLamaFilter) (*entity.PedagangLamaResponse, error) {
	if filter.Page < 1 {
		filter.Page = 1
	}
	if filter.Limit < 1 {
		filter.Limit = 20
	}
	data, total, err := u.repo.GetPedagangLama(ctx, filter)
	if err != nil {
		return nil, err
	}
	return &entity.PedagangLamaResponse{Data: data, Total: total, Page: filter.Page, Limit: filter.Limit}, nil
}

// CreatePedagang -- "Tambah Data" manual, hasilnya selalu berstatus
// "lama" (lihat catatan di repository.CreatePedagangManual).
// validasiPedagangRequest -- dipakai baik dari jalur manual maupun
// import file, biar batasannya konsisten (NIK maks 16 digit, kontak
// maks 13 digit) walau data importnya gak lewat validasi Bind() Fiber.
func validasiPedagangRequest(req *entity.CreatePedagangRequest) error {
	if req.NamaLengkap == "" || req.NIK == "" || req.NamaUsaha == "" || req.Email == "" {
		return fmt.Errorf("nama lengkap, NIK, email, dan nama usaha wajib diisi")
	}
	if !strings.Contains(req.Email, "@") {
		return fmt.Errorf("format email gak valid")
	}
	if len(req.NIK) > 16 {
		return fmt.Errorf("NIK maksimal 16 digit")
	}
	if len(req.Phone) > 13 {
		return fmt.Errorf("nomor kontak maksimal 13 digit")
	}
	return nil
}

func (u *manajemenLapakUsecase) CreatePedagang(ctx context.Context, req *entity.CreatePedagangRequest) (*entity.CreatePedagangResult, error) {
	if err := validasiPedagangRequest(req); err != nil {
		return nil, err
	}
	return u.repo.CreatePedagangManual(ctx, req)
}

// ImportPedagang -- import banyak pedagang sekaligus dari file
// (JSON/CSV, sudah di-parse jadi []CreatePedagangRequest di
// controller). Baris yang gagal (mis. NIK dobel, NIK/kontak kepanjangan)
// TIDAK menggagalkan baris lain, cuma dicatat di Errors.
func (u *manajemenLapakUsecase) ImportPedagang(ctx context.Context, rows []entity.CreatePedagangRequest) (*entity.ImportPedagangResult, error) {
	if len(rows) == 0 {
		return nil, fmt.Errorf("file gak ada isinya / gagal dibaca")
	}

	valid := make([]entity.CreatePedagangRequest, 0, len(rows))
	var errs []string
	for i, row := range rows {
		if err := validasiPedagangRequest(&row); err != nil {
			errs = append(errs, fmt.Sprintf("baris %d (NIK %s): %s", i+1, row.NIK, err.Error()))
			continue
		}
		valid = append(valid, row)
	}

	berhasil, _, errsSimpan := u.repo.ImportPedagangBatch(ctx, valid)
	errs = append(errs, errsSimpan...)
	return &entity.ImportPedagangResult{Berhasil: berhasil, Gagal: len(rows) - berhasil, Errors: errs}, nil
}

func (u *manajemenLapakUsecase) CreateKecamatan(ctx context.Context, namaKecamatan string) (string, error) {
	if namaKecamatan == "" {
		return "", fmt.Errorf("nama kecamatan wajib diisi")
	}
	return u.repo.CreateKecamatan(ctx, namaKecamatan)
}

func (u *manajemenLapakUsecase) CreateJalanBaru(ctx context.Context, req *entity.CreateJalanBaruRequest) (string, error) {
	if req.NamaJalan == "" || req.KodeJalan == "" || req.KecamatanID == "" {
		return "", fmt.Errorf("kecamatan, kode jalan, dan nama jalan wajib diisi")
	}
	if req.Kapasitas <= 0 {
		return "", fmt.Errorf("kapasitas harus lebih dari 0")
	}
	return u.repo.CreateJalanBaru(ctx, req)
}

// UpdateJalanBaru -- edit kode/nama/kapasitas jalan yang sudah ada.
// Sama kayak ruas: gak butuh event aktif, bisa dipakai kapan aja.
// Kapasitas baru divalidasi dua arah -- gak boleh diturunkan sampai di
// bawah total kuota ruas jalan ini (batas fallback), ATAUPUN di bawah
// kuota jalan ini di event yang lagi aktif kalau memang lagi diikutkan
// (biar konsisten sama validasi kuota <= kapasitas di tempat lain).
func (u *manajemenLapakUsecase) UpdateJalanBaru(ctx context.Context, jalanID string, req *entity.UpdateJalanBaruRequest) error {
	if req.NamaJalan == "" || req.KodeJalan == "" {
		return fmt.Errorf("kode jalan dan nama jalan wajib diisi")
	}
	if req.Kapasitas <= 0 {
		return fmt.Errorf("kapasitas harus lebih dari 0")
	}

	ada, err := u.repo.JalanExists(ctx, jalanID)
	if err != nil {
		return err
	}
	if !ada {
		return ErrJalanTidakDitemukan
	}

	kuotaRuas, err := u.repo.SumKuotaRuas(ctx, jalanID)
	if err != nil {
		return err
	}
	if req.Kapasitas < kuotaRuas {
		return fmt.Errorf("kapasitas (%d) tidak boleh kurang dari total kuota ruas yang sudah dialokasikan di jalan ini (%d)", req.Kapasitas, kuotaRuas)
	}

	if eventID, errAktif := u.repo.GetActiveEventID(ctx); errAktif == nil {
		if kuotaEvent, errKuota := u.repo.KuotaJalanUntukEvent(ctx, jalanID, eventID); errKuota == nil && req.Kapasitas < kuotaEvent {
			return fmt.Errorf("kapasitas (%d) tidak boleh kurang dari kuota jalan ini di event yang aktif (%d)", req.Kapasitas, kuotaEvent)
		}
	}

	return u.repo.UpdateJalanBaru(ctx, jalanID, req)
}

func (u *manajemenLapakUsecase) DeleteEvent(ctx context.Context, eventID string) error {
	return u.repo.DeleteEvent(ctx, eventID)
}

func (u *manajemenLapakUsecase) DeleteKecamatan(ctx context.Context, kecamatanID string) error {
	return u.repo.DeleteKecamatan(ctx, kecamatanID)
}

func (u *manajemenLapakUsecase) DeleteJalanBaru(ctx context.Context, jalanID string) error {
	return u.repo.DeleteJalanBaru(ctx, jalanID)
}

// AssignJalanKeEventAktif -- solusi buat jalan yang dibuat SETELAH
// event-nya aktif: assign kuotanya ke event yang lagi aktif kapan
// aja, gak perlu edit ulang event dari awal. Validasi sama kayak pas
// bikin event: total kuota semua jalan di event ini gak boleh lebih
// dari kuota total event-nya.
func (u *manajemenLapakUsecase) AssignJalanKeEventAktif(ctx context.Context, jalanID string, req *entity.AssignJalanEventRequest) error {
	if req.Kuota <= 0 {
		return fmt.Errorf("kuota harus lebih dari 0")
	}

	ada, err := u.repo.JalanExists(ctx, jalanID)
	if err != nil {
		return err
	}
	if !ada {
		return ErrJalanTidakDitemukan
	}

	kapasitas, err := u.repo.GetJalanKapasitas(ctx, jalanID)
	if err != nil {
		return err
	}
	if req.Kuota > kapasitas {
		return fmt.Errorf("%w: kuota %d, kapasitas %d", ErrKuotaLebihDariKapasitas, req.Kuota, kapasitas)
	}

	eventID, err := u.repo.GetActiveEventID(ctx)
	if err != nil {
		return fmt.Errorf("belum ada event yang diaktifkan: %w", err)
	}

	kuotaTotalEvent, err := u.repo.GetKuotaTotalEvent(ctx, eventID)
	if err != nil {
		return err
	}

	sudahDipakai, err := u.repo.SumKuotaJalanEvent(ctx, eventID, jalanID)
	if err != nil {
		return err
	}
	if sudahDipakai+req.Kuota > kuotaTotalEvent {
		return ErrKuotaJalanLebihDariEvent
	}

	return u.repo.AssignJalanKeEventAktif(ctx, eventID, jalanID, req.Kuota)
}

// UpdateKuotaJalanEvent -- petugas bisa atur/edit kuota jalan buat
// SEBUAH event tertentu, event itu boleh aktif ATAUPUN TIDAK (gak
// kayak AssignJalanKeEventAktif yang cuma nempel ke event yang lagi
// aktif). eventID dikirim eksplisit dari FE (event mana yang lagi
// dipilih petugas di dropdown), bukan diambil dari "event aktif".
//
// Kalau jalan ini belum pernah diikutkan ke event tsb (mis. jalan
// baru, atau event lama yang jalan ini emang belum pernah dimasukin),
// baris kuotanya di-upsert (nambah baru) alih-alih ditolak -- jadi
// modal "Atur Kuota Event" ini bisa dipakai buat NAMBAH kuota jalan
// ke event manapun, gak cuma buat NGEDIT yang udah ada di event aktif.
func (u *manajemenLapakUsecase) UpdateKuotaJalanEvent(ctx context.Context, eventID, jalanID string, req *entity.AssignJalanEventRequest) error {
	if req.Kuota <= 0 {
		return fmt.Errorf("kuota harus lebih dari 0")
	}

	ada, err := u.repo.JalanExists(ctx, jalanID)
	if err != nil {
		return err
	}
	if !ada {
		return ErrJalanTidakDitemukan
	}

	kapasitas, err := u.repo.GetJalanKapasitas(ctx, jalanID)
	if err != nil {
		return err
	}
	if req.Kuota > kapasitas {
		return fmt.Errorf("%w: kuota %d, kapasitas %d", ErrKuotaLebihDariKapasitas, req.Kuota, kapasitas)
	}

	kuotaTotalEvent, err := u.repo.GetKuotaTotalEvent(ctx, eventID)
	if err != nil {
		return err
	}

	// diikutkan=false -> jalan ini belum punya baris kuota di event ini
	// sama sekali, jadi terisi-nya otomatis 0 (belum ada pedagang yang
	// bisa check-in ke kombinasi jalan+event yang belum pernah ada).
	terisi, diikutkan, err := u.repo.GetTerisiJalanEvent(ctx, jalanID, eventID)
	if err != nil {
		return err
	}
	if diikutkan && req.Kuota < terisi {
		return fmt.Errorf("kuota tidak boleh kurang dari %d (jumlah pedagang yang sudah check-in di jalan ini)", terisi)
	}

	sudahDipakai, err := u.repo.SumKuotaJalanEvent(ctx, eventID, jalanID)
	if err != nil {
		return err
	}
	if sudahDipakai+req.Kuota > kuotaTotalEvent {
		return ErrKuotaJalanLebihDariEvent
	}

	if !diikutkan {
		// Belum ada baris buat kombinasi jalan+event ini -- upsert (insert
		// baru), bukan UPDATE biasa (yang bakal 0 rows affected / gagal
		// diam-diam kalau baris belum ada).
		return u.repo.AssignJalanKeEventAktif(ctx, eventID, jalanID, req.Kuota)
	}
	return u.repo.UpdateKuotaJalanEvent(ctx, eventID, jalanID, req.Kuota)
}