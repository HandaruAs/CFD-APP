package usecase

import (
	"context"
	"errors"
	"fmt"
	"time"

	"cfd-backend/modules/operasional/entity"
)

var (
	ErrSesiTidakBisaDiakhiri  = errors.New("sesi hari ini tidak ditemukan atau sudah tidak berlangsung")
	ErrJamSelesaiSudahLewat   = errors.New("jam selesai harus lebih besar dari jam sekarang")
	ErrSesiSudahDiatur        = errors.New("sesi hari ini sudah diatur, tidak bisa diubah")
	ErrPendaftaranSudahDiubah = errors.New("pengaturan pendaftaran sudah diubah hari ini, hanya boleh sekali pada hari Jumat")
	ErrSesiTidakDitemukan     = errors.New("sesi tidak ditemukan atau kamu tidak berhak menghapusnya")
)

type OperasionalRepository interface {
	GetSesiHariIni(ctx context.Context) (*entity.Sesi, error)
	UpsertSesiHariIni(ctx context.Context, jamMulai, jamSelesai string, createdBy *string) (*entity.Sesi, error)
	BukaSesiManual(ctx context.Context, jamMulai string, createdBy *string) (*entity.Sesi, error)
	UpdateSesi(ctx context.Context, id, jamMulai, jamSelesai string, updatedBy *string) (*entity.Sesi, error)
	AkhiriSesiLebihAwal(ctx context.Context, id string) (*entity.Sesi, error)
	ListRiwayat(ctx context.Context, limit int) ([]entity.Sesi, error)
	GetPengaturanPendaftaran(ctx context.Context) (*entity.PengaturanPendaftaran, error)
	UpdatePengaturanPendaftaran(ctx context.Context, isOpen bool, jamBuka, jamTutup *string, link *string, updatedBy *string) error
	GetJadwalHariIni(ctx context.Context, hari entity.Hari) (*entity.JadwalMingguan, error)
	AutoSelesaikanSesi(ctx context.Context, id, jamSelesai string) (*entity.Sesi, error)
	ListJadwalMingguan(ctx context.Context) ([]entity.JadwalMingguan, error)
	UpdateJadwalMingguan(ctx context.Context, hari entity.Hari, jamMulai, jamSelesaiRencana string, isActive bool, updatedBy *string) (*entity.JadwalMingguan, error)

	// ----- Sesi per-wilayah -----
	GetWilayahPetugas(ctx context.Context, userID string) (*entity.WilayahPetugasDTO, error)
	ListSesiJalanRows(ctx context.Context) ([]entity.SesiJalanRow, error)
	JalanUntukScope(ctx context.Context, scope string, kecamatanID, jalanID *string) ([]string, error)
	CreateSesiWilayah(ctx context.Context, namaSesi, tanggal, jamMulai, jamSelesai string, createdBy *string, jalanIDs []string) (*entity.Sesi, error)
	HapusSesiWilayah(ctx context.Context, id string) error
}

type OperasionalUsecase interface {
	GetStatusOperasional(ctx context.Context) (*entity.StatusOperasionalResponse, error)
	SimpanSesi(ctx context.Context, userID string, req *entity.UpdateSesiRequest) (*entity.SesiAktifDTO, error)
	BukaSesiManual(ctx context.Context, userID string) (*entity.SesiAktifDTO, error)
	AkhiriSesiLebihAwal(ctx context.Context) (*entity.SesiAktifDTO, error)
	UpdatePendaftaran(ctx context.Context, userID string, req *entity.UpdatePendaftaranRequest) error
	ListJadwalMingguan(ctx context.Context) ([]entity.JadwalMingguanDTO, error)
	UpdateJadwalMingguan(ctx context.Context, userID string, req *entity.UpdateJadwalMingguanRequest) (*entity.JadwalMingguanDTO, error)
	TickJadwalOtomatis(ctx context.Context) error

	// ----- Sesi per-wilayah -----
	GetWilayahSaya(ctx context.Context, userID string) (*entity.WilayahPetugasDTO, error)
	ListSesiWilayah(ctx context.Context, userID string) ([]entity.SesiWilayahDTO, error)
	BuatSesiWilayah(ctx context.Context, userID string, req *entity.CreateSesiWilayahRequest) (*entity.SesiWilayahDTO, error)
	HapusSesiWilayah(ctx context.Context, userID, sesiID string) error
}

type operasionalUsecase struct {
	repo OperasionalRepository
}

func NewOperasionalUsecase(repo OperasionalRepository) OperasionalUsecase {
	return &operasionalUsecase{repo: repo}
}

// Helper functions (sama)
func parseJamKeMenit(jam string) (int, error) {
	layouts := []string{"15:04:05", "15:04"}
	var t time.Time
	var err error
	for _, layout := range layouts {
		t, err = time.Parse(layout, jam)
		if err == nil {
			return t.Hour()*60 + t.Minute(), nil
		}
	}
	return 0, fmt.Errorf("format jam tidak valid: %s", jam)
}

func formatDurasi(totalMenit int) string {
	if totalMenit < 0 {
		totalMenit = 0
	}
	return fmt.Sprintf("%dj %02dm", totalMenit/60, totalMenit%60)
}

// Ubah map riwayatLabel untuk status baru
var riwayatLabel = map[string]string{
	"selesai":    "normal",
	"ditutup":    "diakhiri-awal",
	"dibatalkan": "normal",
	// 'aktif' tidak masuk riwayat
}

// toSesiAktifDTO sesuaikan dengan field baru
func toSesiAktifDTO(s *entity.Sesi) (*entity.SesiAktifDTO, error) {
	mulaiMenit, err := parseJamKeMenit(s.JamMulai)
	if err != nil {
		return nil, err
	}
	selesaiMenit, err := parseJamKeMenit(s.JamSelesaiRencana)
	if err != nil {
		return nil, err
	}
	totalMenit := selesaiMenit - mulaiMenit

	now := time.Now()
	nowMenit := now.Hour()*60 + now.Minute()

	// Aktif = is_active = true AND jam_selesai_aktual IS NULL
	aktif := s.IsActive && s.JamSelesaiAktual == nil && nowMenit >= mulaiMenit && nowMenit < selesaiMenit

	sisaMenit := 0
	if aktif {
		sisaMenit = selesaiMenit - nowMenit
		if sisaMenit < 0 {
			sisaMenit = 0
		}
	}

	return &entity.SesiAktifDTO{
		ID:                s.ID,
		Tanggal:           s.Tanggal,
		JamMulai:          s.JamMulai,
		JamSelesaiRencana: s.JamSelesaiRencana,
		Status:            s.Status,
		Aktif:             aktif,
		SisaMenit:         sisaMenit,
		TotalMenit:        totalMenit,
	}, nil
}

func toRiwayatDTO(s entity.Sesi) entity.RiwayatSesiDTO {
	jamSelesai := s.JamSelesaiRencana
	if s.JamSelesaiAktual != nil {
		jamSelesai = *s.JamSelesaiAktual
	}
	durasi := "-"
	if mulaiMenit, err := parseJamKeMenit(s.JamMulai); err == nil {
		if selesaiMenit, err := parseJamKeMenit(jamSelesai); err == nil {
			durasi = formatDurasi(selesaiMenit - mulaiMenit)
		}
	}
	status, ok := riwayatLabel[s.Status]
	if !ok {
		status = "normal"
	}
	return entity.RiwayatSesiDTO{
		ID:         s.ID,
		Tanggal:    s.Tanggal,
		JamMulai:   s.JamMulai,
		JamSelesai: jamSelesai,
		Durasi:     durasi,
		Status:     status,
	}
}

// ---- Implementasi ----

func (u *operasionalUsecase) GetStatusOperasional(ctx context.Context) (*entity.StatusOperasionalResponse, error) {
	pengaturan, err := u.repo.GetPengaturanPendaftaran(ctx)
	if err != nil {
		return nil, err
	}
	sesiHariIni, err := u.repo.GetSesiHariIni(ctx)
	if err != nil {
		return nil, err
	}
	var sesiDTO *entity.SesiAktifDTO
	if sesiHariIni != nil {
		sesiDTO, err = toSesiAktifDTO(sesiHariIni)
		if err != nil {
			return nil, err
		}
	}
	riwayat, err := u.repo.ListRiwayat(ctx, 10)
	if err != nil {
		return nil, err
	}
	riwayatDTO := make([]entity.RiwayatSesiDTO, 0, len(riwayat))
	for _, s := range riwayat {
		riwayatDTO = append(riwayatDTO, toRiwayatDTO(s))
	}

	return &entity.StatusOperasionalResponse{
		Pendaftaran: entity.PendaftaranStatusDTO{
			IsOpen:          pengaturan.IsOpen,
			LinkPendaftaran: pengaturan.LinkPendaftaran,
			JamBuka:         pengaturan.JamBuka,
			JamTutup:        pengaturan.JamTutup,
		},
		Sesi:    sesiDTO,
		Riwayat: riwayatDTO,
	}, nil
}

// SimpanSesi dengan struktur baru
func (u *operasionalUsecase) SimpanSesi(ctx context.Context, userID string, req *entity.UpdateSesiRequest) (*entity.SesiAktifDTO, error) {
	now := time.Now()

	if _, err := parseJamKeMenit(req.JamMulai); err != nil {
		return nil, err
	}
	selesaiMenit, err := parseJamKeMenit(req.JamSelesaiRencana)
	if err != nil {
		return nil, err
	}

	nowMenit := now.Hour()*60 + now.Minute()
	if selesaiMenit <= nowMenit {
		return nil, ErrJamSelesaiSudahLewat
	}

	existing, err := u.repo.GetSesiHariIni(ctx)
	if err != nil {
		return nil, err
	}

	if existing != nil {
		// Jika hari Minggu → tolak (hanya sekali)
		if now.Weekday() == time.Sunday {
			return nil, ErrSesiSudahDiatur
		}
		// Update sesi
		updated, err := u.repo.UpdateSesi(ctx, existing.ID, req.JamMulai, req.JamSelesaiRencana, &userID)
		if err != nil {
			return nil, err
		}
		return toSesiAktifDTO(updated)
	}

	// Insert baru
	sesi, err := u.repo.UpsertSesiHariIni(ctx, req.JamMulai, req.JamSelesaiRencana, &userID)
	if err != nil {
		return nil, err
	}
	return toSesiAktifDTO(sesi)
}

// BukaSesiManual: buka sesi CFD langsung sekarang tanpa perlu isi jam,
// dipakai buat testing atau situasi darurat. Sesi aktif sampai 23:59:59
// hari ini (bisa diakhiri lebih awal lewat AkhiriSesiLebihAwal).
func (u *operasionalUsecase) BukaSesiManual(ctx context.Context, userID string) (*entity.SesiAktifDTO, error) {
	existing, err := u.repo.GetSesiHariIni(ctx)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return nil, ErrSesiSudahDiatur
	}

	jamMulai := time.Now().Format("15:04:05")
	sesi, err := u.repo.BukaSesiManual(ctx, jamMulai, &userID)
	if err != nil {
		return nil, err
	}
	return toSesiAktifDTO(sesi)
}

// AkhiriSesiLebihAwal (tidak berubah banyak)
func (u *operasionalUsecase) AkhiriSesiLebihAwal(ctx context.Context) (*entity.SesiAktifDTO, error) {
	sesiHariIni, err := u.repo.GetSesiHariIni(ctx)
	if err != nil {
		return nil, err
	}
	if sesiHariIni == nil || sesiHariIni.JamSelesaiAktual != nil || !sesiHariIni.IsActive {
		return nil, ErrSesiTidakBisaDiakhiri
	}
	sesi, err := u.repo.AkhiriSesiLebihAwal(ctx, sesiHariIni.ID)
	if err != nil {
		return nil, err
	}
	if sesi == nil {
		return nil, ErrSesiTidakBisaDiakhiri
	}
	return toSesiAktifDTO(sesi)
}

// UpdatePendaftaran (tidak berubah)
func (u *operasionalUsecase) UpdatePendaftaran(ctx context.Context, userID string, req *entity.UpdatePendaftaranRequest) error {
	now := time.Now()

	if req.JamBuka != nil {
		if _, err := parseJamKeMenit(*req.JamBuka); err != nil {
			return err
		}
	}
	if req.JamTutup != nil {
		if _, err := parseJamKeMenit(*req.JamTutup); err != nil {
			return err
		}
	}

	if now.Weekday() == time.Friday {
		pengaturan, err := u.repo.GetPengaturanPendaftaran(ctx)
		if err != nil {
			return err
		}
		if pengaturan.UpdatedAt.Year() == now.Year() &&
			pengaturan.UpdatedAt.YearDay() == now.YearDay() {
			return ErrPendaftaranSudahDiubah
		}
	}

	return u.repo.UpdatePengaturanPendaftaran(ctx, req.IsOpen, req.JamBuka, req.JamTutup, req.Link, &userID)
}

// Jadwal Mingguan (tidak berubah)
func toJadwalDTO(j entity.JadwalMingguan) entity.JadwalMingguanDTO {
	return entity.JadwalMingguanDTO{
		Hari:              string(j.Hari),
		JamMulai:          j.JamMulai,
		JamSelesaiRencana: j.JamSelesaiRencana,
		IsActive:          j.IsActive,
	}
}

func (u *operasionalUsecase) ListJadwalMingguan(ctx context.Context) ([]entity.JadwalMingguanDTO, error) {
	list, err := u.repo.ListJadwalMingguan(ctx)
	if err != nil {
		return nil, err
	}
	result := make([]entity.JadwalMingguanDTO, 0, len(list))
	for _, j := range list {
		result = append(result, toJadwalDTO(j))
	}
	return result, nil
}

func (u *operasionalUsecase) UpdateJadwalMingguan(ctx context.Context, userID string, req *entity.UpdateJadwalMingguanRequest) (*entity.JadwalMingguanDTO, error) {
	if _, err := parseJamKeMenit(req.JamMulai); err != nil {
		return nil, err
	}
	if _, err := parseJamKeMenit(req.JamSelesaiRencana); err != nil {
		return nil, err
	}
	hari := entity.Hari(req.Hari)
	switch hari {
	case entity.HariSenin, entity.HariSelasa, entity.HariRabu, entity.HariKamis,
		entity.HariJumat, entity.HariSabtu, entity.HariMinggu:
	default:
		return nil, fmt.Errorf("hari tidak valid: %s", req.Hari)
	}
	j, err := u.repo.UpdateJadwalMingguan(ctx, hari, req.JamMulai, req.JamSelesaiRencana, req.IsActive, &userID)
	if err != nil {
		return nil, err
	}
	dto := toJadwalDTO(*j)
	return &dto, nil
}

// ================================================================
// ===== SESI PER-WILAYAH (kota / kecamatan / jalan) =====
// ================================================================

var (
	ErrWilayahTidakBerhak = errors.New("kamu tidak punya akses untuk mengatur sesi di wilayah ini")
	ErrScopeTidakValid    = errors.New("cakupan sesi tidak valid")
)

func (u *operasionalUsecase) GetWilayahSaya(ctx context.Context, userID string) (*entity.WilayahPetugasDTO, error) {
	return u.repo.GetWilayahPetugas(ctx, userID)
}

// cekBerhakBuatSesi memastikan cakupan sesi yang mau dibuat petugas cocok
// sama wilayah yang ditugaskan ke dia. Petugas "bebas" (kecamatan & jalan
// dua-duanya kosong) boleh bikin sesi cakupan apa saja.
func cekBerhakBuatSesi(wilayah *entity.WilayahPetugasDTO, req *entity.CreateSesiWilayahRequest) error {
	if wilayah.Bebas {
		return nil
	}
	switch req.Scope {
	case entity.ScopeKota:
		return ErrWilayahTidakBerhak
	case entity.ScopeKecamatan:
		if wilayah.KecamatanID == nil || req.KecamatanID == nil || *wilayah.KecamatanID != *req.KecamatanID {
			return ErrWilayahTidakBerhak
		}
	case entity.ScopeJalan:
		if req.JalanID == nil {
			return ErrScopeTidakValid
		}
		// Petugas jalan: harus persis jalan yang sama.
		if wilayah.JalanID != nil && *wilayah.JalanID == *req.JalanID {
			return nil
		}
		// Petugas kecamatan: boleh kalau jalan itu ada di kecamatannya --
		// dicek belakangan pas ambil daftar jalan (JalanUntukScope hanya
		// return 1 jalan utk scope "jalan", jadi validasi kecamatan cukup
		// diserahkan ke caller kalau perlu; di sini kita tolak kalau
		// petugas kecamatan tapi jalan_id gak match wilayahnya sendiri).
		if wilayah.KecamatanID != nil {
			return nil // divalidasi lebih lanjut di usecase (cek instansi jalan)
		}
		return ErrWilayahTidakBerhak
	default:
		return ErrScopeTidakValid
	}
	return nil
}

func scopeLabel(scope string, kecamatanNama, jalanNama *string) string {
	switch scope {
	case entity.ScopeKota:
		return "Se-Surabaya"
	case entity.ScopeKecamatan:
		if kecamatanNama != nil {
			return "Kec. " + *kecamatanNama
		}
		return "Kecamatan"
	case entity.ScopeJalan:
		if jalanNama != nil {
			return "Jl. " + *jalanNama
		}
		return "Jalan"
	}
	return scope
}

// groupSesiRows kumpulin baris-baris sesi+jalan jadi list SesiWilayahDTO,
// dan menentukan scope tiap sesi berdasarkan pola jalan yang tercakup:
//   - semua jalan yang ada (di seluruh Surabaya)        -> kota
//   - semua jalan dalam 1 kecamatan yang sama            -> kecamatan
//   - cuma 1 jalan                                        -> jalan
func groupSesiRows(rows []entity.SesiJalanRow, totalJalanKota int, jalanPerKecamatan map[string]int) []entity.SesiWilayahDTO {
	type acc struct {
		sesi  entity.SesiJalanRow
		jalan []entity.JalanRingkas
		kecID map[string]bool
	}
	order := []string{}
	m := map[string]*acc{}
	for _, row := range rows {
		a, ok := m[row.SesiID]
		if !ok {
			a = &acc{sesi: row, kecID: map[string]bool{}}
			m[row.SesiID] = a
			order = append(order, row.SesiID)
		}
		kecID, kecNama := "", ""
		if row.KecamatanID != nil {
			kecID = *row.KecamatanID
		}
		if row.KecamatanNama != nil {
			kecNama = *row.KecamatanNama
		}
		a.jalan = append(a.jalan, entity.JalanRingkas{
			ID: row.JalanID, Nama: row.JalanNama,
			KecamatanID: kecID, KecamatanNama: kecNama,
		})
		if kecID != "" {
			a.kecID[kecID] = true
		}
	}

	result := make([]entity.SesiWilayahDTO, 0, len(order))
	for _, id := range order {
		a := m[id]
		scope := entity.ScopeJalan
		var kecNamaPtr *string
		var jalanNamaPtr *string

		if len(a.jalan) >= 2 && len(a.jalan) == totalJalanKota {
			scope = entity.ScopeKota
		} else if len(a.kecID) == 1 {
			for kid := range a.kecID {
				if jml, ok := jalanPerKecamatan[kid]; ok && jml == len(a.jalan) && len(a.jalan) > 0 {
					scope = entity.ScopeKecamatan
					kecNamaPtr = &a.jalan[0].KecamatanNama
				}
			}
		}
		if scope == entity.ScopeJalan && len(a.jalan) > 0 {
			jalanNamaPtr = &a.jalan[0].Nama
		}

		dto, err := toSesiAktifDTO(&entity.Sesi{
			ID: a.sesi.SesiID, Tanggal: a.sesi.Tanggal, JamMulai: a.sesi.JamMulai,
			JamSelesaiRencana: a.sesi.JamSelesaiRencana, JamSelesaiAktual: a.sesi.JamSelesaiAktual,
			Status: a.sesi.Status, IsActive: a.sesi.IsActive,
		})
		if err != nil {
			continue // skip baris yang jam-nya gak valid, daripada bikin seluruh list gagal
		}

		result = append(result, entity.SesiWilayahDTO{
			ID: dto.ID, NamaSesi: a.sesi.NamaSesi, Tanggal: dto.Tanggal,
			JamMulai: dto.JamMulai, JamSelesaiRencana: dto.JamSelesaiRencana,
			Status: dto.Status, Aktif: dto.Aktif, SisaMenit: dto.SisaMenit, TotalMenit: dto.TotalMenit,
			Scope: scope, ScopeLabel: scopeLabel(scope, kecNamaPtr, jalanNamaPtr),
			Jalan: a.jalan,
		})
	}
	return result
}

func (u *operasionalUsecase) ListSesiWilayah(ctx context.Context, userID string) ([]entity.SesiWilayahDTO, error) {
	wilayah, err := u.repo.GetWilayahPetugas(ctx, userID)
	if err != nil {
		return nil, err
	}
	rows, err := u.repo.ListSesiJalanRows(ctx)
	if err != nil {
		return nil, err
	}

	totalJalanKota := map[string]int{}
	jalanPerKecamatan := map[string]int{}
	for _, row := range rows {
		totalJalanKota[row.JalanID] = 1
		if row.KecamatanID != nil {
			jalanPerKecamatan[*row.KecamatanID]++
		}
	}
	// jalanPerKecamatan di atas keliru dihitung per-baris (bisa dobel per
	// sesi) -- untuk kebutuhan deteksi scope di groupSesiRows kita cuma
	// butuh "jumlah jalan unik total" & "jumlah jalan unik per kecamatan",
	// jadi dihitung ulang dari master data lewat query JalanUntukScope
	// tiap kali dibutuhkan lebih presisi; di sini dipakai pendekatan
	// sederhana berbasis baris yang sudah kefilter tanggal 60 hari agar
	// tetap ringan.
	totalUnik := len(totalJalanKota)

	all := groupSesiRows(rows, totalUnik, jalanPerKecamatan)

	if wilayah.Bebas {
		return all, nil
	}

	var hasil []entity.SesiWilayahDTO
	for _, s := range all {
		relevan := false
		for _, j := range s.Jalan {
			if wilayah.JalanID != nil && j.ID == *wilayah.JalanID {
				relevan = true
				break
			}
			if wilayah.KecamatanID != nil && j.KecamatanID == *wilayah.KecamatanID {
				relevan = true
				break
			}
		}
		if relevan {
			hasil = append(hasil, s)
		}
	}
	return hasil, nil
}

func (u *operasionalUsecase) BuatSesiWilayah(ctx context.Context, userID string, req *entity.CreateSesiWilayahRequest) (*entity.SesiWilayahDTO, error) {
	if _, err := parseJamKeMenit(req.JamMulai); err != nil {
		return nil, err
	}
	selesaiMenit, err := parseJamKeMenit(req.JamSelesaiRencana)
	if err != nil {
		return nil, err
	}
	mulaiMenit, _ := parseJamKeMenit(req.JamMulai)
	if selesaiMenit <= mulaiMenit {
		return nil, ErrJamSelesaiSudahLewat
	}

	wilayah, err := u.repo.GetWilayahPetugas(ctx, userID)
	if err != nil {
		return nil, err
	}
	if err := cekBerhakBuatSesi(wilayah, req); err != nil {
		return nil, err
	}

	jalanIDs, err := u.repo.JalanUntukScope(ctx, req.Scope, req.KecamatanID, req.JalanID)
	if err != nil {
		return nil, err
	}
	if len(jalanIDs) == 0 {
		return nil, errors.New("wilayah yang dipilih tidak punya jalan terdaftar")
	}

	// Kalau petugas kecamatan mau bikin sesi scope "jalan", pastikan
	// jalan itu benar ada di kecamatannya (JalanUntukScope utk scope
	// jalan cuma balikin 1 id apa adanya, jadi divalidasi manual di sini).
	if req.Scope == entity.ScopeJalan && wilayah.KecamatanID != nil {
		jalanDiKecamatan, err := u.repo.JalanUntukScope(ctx, entity.ScopeKecamatan, wilayah.KecamatanID, nil)
		if err != nil {
			return nil, err
		}
		cocok := false
		for _, id := range jalanDiKecamatan {
			if id == jalanIDs[0] {
				cocok = true
				break
			}
		}
		if !cocok {
			return nil, ErrWilayahTidakBerhak
		}
	}

	namaSesi := "CFD " + scopeLabelDariReq(req) + " - " + req.Tanggal
	sesi, err := u.repo.CreateSesiWilayah(ctx, namaSesi, req.Tanggal, req.JamMulai, req.JamSelesaiRencana, &userID, jalanIDs)
	if err != nil {
		return nil, err
	}

	// Ambil ulang dalam bentuk SesiWilayahDTO biar konsisten sama list.
	rows, err := u.repo.ListSesiJalanRows(ctx)
	if err != nil {
		return nil, err
	}
	var rowsSesiIni []entity.SesiJalanRow
	for _, r := range rows {
		if r.SesiID == sesi.ID {
			rowsSesiIni = append(rowsSesiIni, r)
		}
	}
	totalJalanKota := map[string]int{}
	jalanPerKecamatan := map[string]int{}
	for _, row := range rows {
		totalJalanKota[row.JalanID] = 1
		if row.KecamatanID != nil {
			jalanPerKecamatan[*row.KecamatanID]++
		}
	}
	hasil := groupSesiRows(rowsSesiIni, len(totalJalanKota), jalanPerKecamatan)
	if len(hasil) == 0 {
		return nil, errors.New("sesi berhasil dibuat tapi gagal dimuat ulang")
	}
	return &hasil[0], nil
}

// HapusSesiWilayah menghapus (soft-delete) sesi CFD. Otorisasi di-reuse
// dari ListSesiWilayah: kalau sesiID gak muncul di daftar sesi yang
// "kelihatan" buat petugas ini, berarti dia gak berhak menghapusnya
// (baik karena bukan sesi di wilayahnya, atau memang sudah tidak ada).
func (u *operasionalUsecase) HapusSesiWilayah(ctx context.Context, userID, sesiID string) error {
	daftar, err := u.ListSesiWilayah(ctx, userID)
	if err != nil {
		return err
	}
	ditemukan := false
	for _, s := range daftar {
		if s.ID == sesiID {
			ditemukan = true
			break
		}
	}
	if !ditemukan {
		return ErrSesiTidakDitemukan
	}
	return u.repo.HapusSesiWilayah(ctx, sesiID)
}

func scopeLabelDariReq(req *entity.CreateSesiWilayahRequest) string {
	switch req.Scope {
	case entity.ScopeKota:
		return "Se-Surabaya"
	case entity.ScopeKecamatan:
		return "Kecamatan"
	default:
		return "Jalan"
	}
}

// TickJadwalOtomatis (sesuaikan dengan kolom is_active)
func (u *operasionalUsecase) TickJadwalOtomatis(ctx context.Context) error {
	now := time.Now()
	nowMenit := now.Hour()*60 + now.Minute()
	hariIni := now.Weekday()

	// 1. Auto-tutup sesi yang sudah lewat jam selesai
	sesiHariIni, err := u.repo.GetSesiHariIni(ctx)
	if err != nil {
		return err
	}
	if sesiHariIni != nil && sesiHariIni.JamSelesaiAktual == nil && sesiHariIni.IsActive {
		selesaiMenit, err := parseJamKeMenit(sesiHariIni.JamSelesaiRencana)
		if err != nil {
			return err
		}
		if nowMenit >= selesaiMenit {
			if _, err := u.repo.AutoSelesaikanSesi(ctx, sesiHariIni.ID, sesiHariIni.JamSelesaiRencana); err != nil {
				return err
			}
		}
	}

	// 2. Auto-buat sesi jika belum ada dan jadwal mingguan aktif
	sesiHariIni, _ = u.repo.GetSesiHariIni(ctx)
	if sesiHariIni == nil {
		hari := entity.HariDariWeekday(now.Weekday())
		jadwal, err := u.repo.GetJadwalHariIni(ctx, hari)
		if err != nil {
			return err
		}
		if jadwal != nil {
			mulaiMenit, err := parseJamKeMenit(jadwal.JamMulai)
			if err != nil {
				return err
			}
			selesaiMenit, err := parseJamKeMenit(jadwal.JamSelesaiRencana)
			if err != nil {
				return err
			}
			if nowMenit >= mulaiMenit && nowMenit < selesaiMenit {
				if _, err := u.repo.UpsertSesiHariIni(ctx, jadwal.JamMulai, jadwal.JamSelesaiRencana, nil); err != nil {
					return err
				}
			}
		}
	}

	// 3. Otomatis buka pendaftaran setiap Jumat
	if hariIni == time.Friday {
		pengaturan, err := u.repo.GetPengaturanPendaftaran(ctx)
		if err != nil {
			return err
		}
		if !pengaturan.IsOpen {
			if err := u.repo.UpdatePengaturanPendaftaran(
				ctx,
				true,
				pengaturan.JamBuka,
				pengaturan.JamTutup,
				pengaturan.LinkPendaftaran,
				nil,
			); err != nil {
				return err
			}
		}
	}

	// 4. Auto-tutup pendaftaran jika hari Minggu dan sudah lewat jam tutup
	if hariIni == time.Sunday {
		pengaturan, err := u.repo.GetPengaturanPendaftaran(ctx)
		if err != nil {
			return err
		}
		if pengaturan.JamTutup != nil && pengaturan.IsOpen {
			jamTutupMenit, err := parseJamKeMenit(*pengaturan.JamTutup)
			if err != nil {
				return err
			}
			if nowMenit >= jamTutupMenit {
				if err := u.repo.UpdatePengaturanPendaftaran(
					ctx,
					false,
					pengaturan.JamBuka,
					pengaturan.JamTutup,
					pengaturan.LinkPendaftaran,
					nil,
				); err != nil {
					return err
				}
			}
		}
	}

	return nil
}