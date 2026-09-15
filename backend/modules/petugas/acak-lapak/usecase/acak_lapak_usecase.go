package usecase

import (
	"context"
	"errors"

	"cfd-backend/modules/petugas/acak-lapak/entity"
)

var (
	ErrWilayahTidakBerhak = errors.New("kamu tidak punya akses untuk generate slot di wilayah ini")
	ErrScopeTidakValid    = errors.New("cakupan tidak valid")
)

type AcakLapakRepository interface {
	GetActiveSessionID(ctx context.Context) (string, error)

	// Buat GenerateSlot (fitur "Acak Lapak" -- pool lokasi yang disiapin
	// petugas SEBELUM ada pedagang daftar).
	GetWilayahPetugas(ctx context.Context, userID string) (*entity.WilayahPetugasSlot, error)
	JalanUntukScope(ctx context.Context, scope string, kecamatanID, jalanID *string) ([]string, error)
	GetKodeEvent(ctx context.Context) (string, error)
	GenerateSlot(ctx context.Context, sessionID string, jalanIDs []string, kodeEvent string, generatedBy *string) (jumlahSlotDibuat int, jumlahSlotAda int, err error)
	GetNamaKecamatan(ctx context.Context, id string) (string, error)
	GetNamaJalan(ctx context.Context, id string) (string, error)
}

type AcakLapakUsecase interface {
	GenerateSlot(ctx context.Context, userID string, req *entity.GenerateSlotRequest) (*entity.GenerateSlotResponse, error)
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
	case entity.ScopeJalan:
		if req.JalanID == nil {
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

func scopeLabelSlot(scope string, kecamatanNama, jalanNama *string) string {
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
	if req.Scope == entity.ScopeJalan && wilayah.KecamatanID != nil && (wilayah.JalanID == nil || *wilayah.JalanID != jalanIDs[0]) {
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

	jumlahDibuat, jumlahAda, err := u.repo.GenerateSlot(ctx, sessionID, jalanIDs, kodeEvent, &userID)
	if err != nil {
		return nil, err
	}

	// Label buat ditampilin ke petugas -- opsional, gagal ambil nama
	// bukan alasan buat nge-gagalin seluruh generate (slot-nya udah
	// kebuat), jadi errornya diabaikan di sini.
	var kecamatanNama, jalanNama *string
	if req.Scope == entity.ScopeKecamatan && req.KecamatanID != nil {
		if nama, err := u.repo.GetNamaKecamatan(ctx, *req.KecamatanID); err == nil {
			kecamatanNama = &nama
		}
	}
	if req.Scope == entity.ScopeJalan && req.JalanID != nil {
		if nama, err := u.repo.GetNamaJalan(ctx, *req.JalanID); err == nil {
			jalanNama = &nama
		}
	}

	return &entity.GenerateSlotResponse{
		Scope:            req.Scope,
		ScopeLabel:       scopeLabelSlot(req.Scope, kecamatanNama, jalanNama),
		JumlahJalan:      len(jalanIDs),
		JumlahSlotDibuat: jumlahDibuat,
		JumlahSlotAda:    jumlahAda,
	}, nil
}