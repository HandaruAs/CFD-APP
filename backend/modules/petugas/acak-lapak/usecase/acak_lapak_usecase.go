package usecase

import (
	"context"
	"errors"

	"cfd-backend/modules/petugas/acak-lapak/entity"
)

var (
	ErrWilayahTidakBerhak = errors.New("kamu tidak punya akses untuk generate slot di wilayah ini")
	ErrScopeTidakValid    = errors.New("cakupan tidak valid")
	ErrRuasWajibDiisi     = errors.New("ruas wajib dipilih untuk cakupan ruas")
)

type AcakLapakRepository interface {
	GetActiveSessionID(ctx context.Context) (string, error)

	// Buat GenerateSlot (fitur "Acak Lapak" -- pool lokasi yang disiapin
	// petugas SEBELUM ada pedagang daftar).
	GetWilayahPetugas(ctx context.Context, userID string) (*entity.WilayahPetugasSlot, error)
	JalanUntukScope(ctx context.Context, scope string, kecamatanID, jalanID *string) ([]string, error)
	GetKodeEvent(ctx context.Context) (string, error)
	GenerateSlot(ctx context.Context, sessionID string, jalanIDs []string, ruasID *string, kodeEvent string, generatedBy *string, hapusTersedia bool, hapusDiJalan []string) (jumlahSlotDibuat int, jumlahSlotAda int, jumlahRuas int, jumlahSlotDihapus int, err error)
	GetRuasJalan(ctx context.Context, jalanID string) ([]entity.RuasOpsi, error)
	GetNamaKecamatan(ctx context.Context, id string) (string, error)
	GetNamaJalan(ctx context.Context, id string) (string, error)
}

type AcakLapakUsecase interface {
	GenerateSlot(ctx context.Context, userID string, req *entity.GenerateSlotRequest) (*entity.GenerateSlotResponse, error)
	GetRuasJalan(ctx context.Context, jalanID string) ([]entity.RuasOpsi, error)
}

type acakLapakUsecase struct {
	repo AcakLapakRepository
}

func NewAcakLapakUsecase(repo AcakLapakRepository) AcakLapakUsecase {
	return &acakLapakUsecase{repo: repo}
}

// cekBerhakGenerateSlot: petugas "bebas" (gak ditugaskan ke wilayah
// manapun) boleh generate scope apapun. Petugas kecamatan cuma boleh
// generate buat kecamatannya sendiri (scope kota ditolak total, scope
// jalan divalidasi belakangan di usecase -- lihat GenerateSlot).
// Petugas jalan cuma boleh generate buat jalan yang sama persis.
// -- niru persis modules/operasional/usecase.cekBerhakBuatSesi.
func cekBerhakGenerateSlot(wilayah *entity.WilayahPetugasSlot, req *entity.GenerateSlotRequest) error {
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
	case entity.ScopeJalan, entity.ScopeRuas:
		if req.JalanID == nil {
			return ErrScopeTidakValid
		}
		if req.Scope == entity.ScopeRuas && req.RuasID == nil {
			return ErrScopeTidakValid
		}
		// Petugas jalan: harus persis jalan yang sama.
		if wilayah.JalanID != nil && *wilayah.JalanID == *req.JalanID {
			return nil
		}
		// Petugas kecamatan: boleh kalau jalan itu ada di kecamatannya --
		// divalidasi lebih lanjut di GenerateSlot (cek instansi jalan),
		// di sini cuma ditolak kalau dia bukan petugas kecamatan sama sekali.
		if wilayah.KecamatanID != nil {
			return nil
		}
		return ErrWilayahTidakBerhak
	default:
		return ErrScopeTidakValid
	}
	return nil
}

func scopeLabelSlot(scope string, kecamatanNama, jalanNama, ruasNama *string) string {
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
			return *jalanNama
		}
		return "Jalan"
	case entity.ScopeRuas:
		label := "Ruas"
		if ruasNama != nil {
			label = "Ruas " + *ruasNama
		}
		if jalanNama != nil {
			label += ", " + *jalanNama
		}
		return label
	default:
		return scope
	}
}

// GenerateSlot: petugas klik "Acak Lapak" -> isi lapak_slot (pool) buat
// jalan-jalan sesuai scope yang dipilih, sejumlah sisa kapasitas yang
// belum ke-provision. Ini TIDAK butuh sesi CFD yang resmi dibuka petugas
// (pakai sesi hari-ini yang sama dengan yang dipakai ClaimLapak, lewat
// GetActiveSessionID -> shared/sesi.ResolveSesiHariIni) -- sesuai
// requirement "petugas acak lokasi lapak di luar sesi CFD".
func (u *acakLapakUsecase) GenerateSlot(ctx context.Context, userID string, req *entity.GenerateSlotRequest) (*entity.GenerateSlotResponse, error) {
	// Dicek di awal (bukan cuma di cekBerhakGenerateSlot) karena petugas
	// "bebas" langsung lolos cek wilayah tanpa masuk switch scope.
	if req.Scope == entity.ScopeRuas && (req.RuasID == nil || *req.RuasID == "") {
		return nil, ErrRuasWajibDiisi
	}

	wilayah, err := u.repo.GetWilayahPetugas(ctx, userID)
	if err != nil {
		return nil, err
	}
	if err := cekBerhakGenerateSlot(wilayah, req); err != nil {
		return nil, err
	}

	jalanIDs, err := u.repo.JalanUntukScope(ctx, req.Scope, req.KecamatanID, req.JalanID)
	if err != nil {
		return nil, err
	}
	if len(jalanIDs) == 0 {
		return nil, errors.New("wilayah yang dipilih tidak punya jalan terdaftar")
	}

	// Kalau petugas kecamatan mau generate scope "jalan", pastikan jalan
	// itu bener ada di kecamatannya (JalanUntukScope utk scope jalan cuma
	// balikin 1 id apa adanya tanpa validasi kecamatan).
	if (req.Scope == entity.ScopeJalan || req.Scope == entity.ScopeRuas) && wilayah.KecamatanID != nil && (wilayah.JalanID == nil || *wilayah.JalanID != jalanIDs[0]) {
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

	sessionID, err := u.repo.GetActiveSessionID(ctx)
	if err != nil {
		return nil, err
	}
	kodeEvent, err := u.repo.GetKodeEvent(ctx)
	if err != nil {
		return nil, err
	}

	var ruasID *string
	if req.Scope == entity.ScopeRuas {
		ruasID = req.RuasID
	}
	// Pool lama yang belum diklaim ikut dibuang (kalau diminta). Admin/
	// petugas bebas -> semua jalan; petugas wilayah -> cuma jalan di
	// wilayahnya sendiri, biar gak ngebuang pool wilayah lain.
	var hapusDiJalan []string
	if req.GantiPoolLama && !wilayah.Bebas {
		if wilayah.JalanID != nil {
			hapusDiJalan = []string{*wilayah.JalanID}
		} else if wilayah.KecamatanID != nil {
			hapusDiJalan, err = u.repo.JalanUntukScope(ctx, entity.ScopeKecamatan, wilayah.KecamatanID, nil)
			if err != nil {
				return nil, err
			}
		}
		if hapusDiJalan == nil {
			hapusDiJalan = []string{}
		}
	}

	jumlahDibuat, jumlahAda, jumlahRuas, jumlahDihapus, err := u.repo.GenerateSlot(ctx, sessionID, jalanIDs, ruasID, kodeEvent, &userID, req.GantiPoolLama, hapusDiJalan)
	if err != nil {
		return nil, err
	}

	// Label buat ditampilin ke petugas -- opsional, gagal ambil nama
	// bukan alasan buat nge-gagalin seluruh generate (slot-nya udah
	// kebuat), jadi errornya diabaikan di sini.
	var kecamatanNama, jalanNama, ruasNama *string
	if req.Scope == entity.ScopeKecamatan && req.KecamatanID != nil {
		if nama, err := u.repo.GetNamaKecamatan(ctx, *req.KecamatanID); err == nil {
			kecamatanNama = &nama
		}
	}
	if (req.Scope == entity.ScopeJalan || req.Scope == entity.ScopeRuas) && req.JalanID != nil {
		if nama, err := u.repo.GetNamaJalan(ctx, *req.JalanID); err == nil {
			jalanNama = &nama
		}
	}
	if req.Scope == entity.ScopeRuas && req.JalanID != nil && req.RuasID != nil {
		if list, err := u.repo.GetRuasJalan(ctx, *req.JalanID); err == nil {
			for _, ru := range list {
				if ru.ID == *req.RuasID {
					nama := ru.NamaRuas
					ruasNama = &nama
					break
				}
			}
		}
	}

	return &entity.GenerateSlotResponse{
		Scope:             req.Scope,
		ScopeLabel:        scopeLabelSlot(req.Scope, kecamatanNama, jalanNama, ruasNama),
		JumlahJalan:       len(jalanIDs),
		JumlahRuas:        jumlahRuas,
		JumlahSlotDibuat:  jumlahDibuat,
		JumlahSlotDihapus: jumlahDihapus,
		JumlahSlotAda:     jumlahAda,
	}, nil
}

// GetRuasJalan: daftar ruas 1 jalan, buat dropdown "Pilih Ruas" di halaman
// Acak Lapak. Jalan yang belum dibagi ruas -> list kosong.
func (u *acakLapakUsecase) GetRuasJalan(ctx context.Context, jalanID string) ([]entity.RuasOpsi, error) {
	return u.repo.GetRuasJalan(ctx, jalanID)
}