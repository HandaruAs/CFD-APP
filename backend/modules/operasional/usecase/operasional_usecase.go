package usecase

import (
	"context"
	"errors"
	"fmt"
	"time"

	"cfd-backend/modules/operasional/entity"
)

// ErrSesiTidakBisaDiakhiri dibalikin kalau petugas coba akhiri sesi yang
// ternyata udah nggak 'berlangsung' lagi (misal: sesi belum pernah dibuat
// hari ini, atau udah diakhiri petugas lain duluan).
var ErrSesiTidakBisaDiakhiri = errors.New("sesi hari ini tidak ditemukan atau sudah tidak berlangsung")

// ErrSesiTidakBisaDiperpanjang dibalikin kalau sesi hari ini belum ada,
// atau sesinya udah 'selesai_normal'/'diakhiri_awal' (sesi yang udah
// berakhir nggak bisa diperpanjang lagi).
var ErrSesiTidakBisaDiperpanjang = errors.New("sesi hari ini tidak ditemukan atau sudah berakhir")

// ErrJamPerpanjangTidakValid dibalikin kalau jam selesai baru yang
// diinput petugas justru lebih cepat/sama dengan jam selesai yang
// sekarang -- itu namanya bukan "perpanjang".
var ErrJamPerpanjangTidakValid = errors.New("jam selesai baru harus lebih lambat dari jam selesai saat ini")

// OperasionalRepository interface kecil, cuma method yang dipakai usecase
// ini -- idiom yang sama kayak UserRepository di auth_usecase.go.
type OperasionalRepository interface {
	GetSesiHariIni(ctx context.Context) (*entity.Sesi, error)
	UpsertSesiHariIni(ctx context.Context, jamMulai, jamSelesaiRencana string, createdBy *string) (*entity.Sesi, error)
	PerpanjangSesi(ctx context.Context, id, jamSelesaiBaru string) (*entity.Sesi, error)
	AkhiriSesiLebihAwal(ctx context.Context, id string) (*entity.Sesi, error)
	ListRiwayat(ctx context.Context, limit int) ([]entity.Sesi, error)
	GetPengaturanPendaftaran(ctx context.Context) (*entity.PengaturanPendaftaran, error)
	UpdatePengaturanPendaftaran(ctx context.Context, isOpen bool, updatedBy *string) error
}

type OperasionalUsecase interface {
	GetStatusOperasional(ctx context.Context) (*entity.StatusOperasionalResponse, error)
	SimpanSesi(ctx context.Context, userID string, req *entity.UpdateSesiRequest) (*entity.SesiAktifDTO, error)
	PerpanjangSesi(ctx context.Context, req *entity.PerpanjangSesiRequest) (*entity.SesiAktifDTO, error)
	AkhiriSesiLebihAwal(ctx context.Context) (*entity.SesiAktifDTO, error)
	UpdatePendaftaran(ctx context.Context, userID string, isOpen bool) error
}

type operasionalUsecase struct {
	repo OperasionalRepository
}

func NewOperasionalUsecase(repo OperasionalRepository) OperasionalUsecase {
	return &operasionalUsecase{repo: repo}
}

// riwayatLabel dipakai buat konversi enum SesiStatus di database
// (snake_case) jadi 3 nilai persis yang dipakai type StatusRiwayat di
// petugas/jam-operasional/page.tsx. Status 'berlangsung' sengaja nggak
// ada di sini karena sesi yang masih berlangsung nggak pernah masuk
// daftar riwayat (lihat query ListRiwayat).
var riwayatLabel = map[entity.SesiStatus]string{
	entity.SesiSelesaiNormal: "normal",
	entity.SesiDiperpanjang:  "diperpanjang",
	entity.SesiDiakhiriAwal:  "diakhiri-awal",
}

// parseJamKeMenit ubah string "HH:MM" atau "HH:MM:SS" jadi total menit
// sejak tengah malam, biar gampang dihitung selisihnya.
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

// formatDurasi ubah selisih menit jadi teks "4j 55m" kayak yang dipakai
// kolom "Durasi" di tabel Riwayat Operasional.
func formatDurasi(totalMenit int) string {
	if totalMenit < 0 {
		totalMenit = 0
	}
	return fmt.Sprintf("%dj %02dm", totalMenit/60, totalMenit%60)
}

// toSesiAktifDTO ngitung sisaMenit & totalMenit dari waktu sekarang
// dibanding jam_selesai_rencana. Catatan: pakai waktu server (time.Now()) --
// pastikan server jalan di timezone Asia/Jakarta (WIB), sama kayak
// konteks CFD Surabaya.
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

	nowMenit := 0
	if s.Status == entity.SesiBerlangsung {
		now := time.Now()
		nowMenit = now.Hour()*60 + now.Minute()
	}

	sisaMenit := selesaiMenit - nowMenit
	if sisaMenit < 0 {
		sisaMenit = 0
	}
	if s.Status != entity.SesiBerlangsung {
		// sesi udah selesai/diakhiri -> nggak ada lagi "sisa waktu"
		sisaMenit = 0
	}

	return &entity.SesiAktifDTO{
		ID:                s.ID,
		Tanggal:           s.Tanggal,
		JamMulai:          s.JamMulai,
		JamSelesaiRencana: s.JamSelesaiRencana,
		Status:            string(s.Status),
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
		Tanggal:    s.Tanggal,
		JamMulai:   s.JamMulai,
		JamSelesai: jamSelesai,
		Durasi:     durasi,
		Status:     status,
	}
}

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
		},
		Sesi:    sesiDTO,
		Riwayat: riwayatDTO,
	}, nil
}

func (u *operasionalUsecase) SimpanSesi(ctx context.Context, userID string, req *entity.UpdateSesiRequest) (*entity.SesiAktifDTO, error) {
	if _, err := parseJamKeMenit(req.JamMulai); err != nil {
		return nil, err
	}
	if _, err := parseJamKeMenit(req.JamSelesaiRencana); err != nil {
		return nil, err
	}

	sesi, err := u.repo.UpsertSesiHariIni(ctx, req.JamMulai, req.JamSelesaiRencana, &userID)
	if err != nil {
		return nil, err
	}
	return toSesiAktifDTO(sesi)
}

func (u *operasionalUsecase) PerpanjangSesi(ctx context.Context, req *entity.PerpanjangSesiRequest) (*entity.SesiAktifDTO, error) {
	jamBaruMenit, err := parseJamKeMenit(req.JamSelesaiBaru)
	if err != nil {
		return nil, err
	}

	sesiHariIni, err := u.repo.GetSesiHariIni(ctx)
	if err != nil {
		return nil, err
	}
	if sesiHariIni == nil || (sesiHariIni.Status != entity.SesiBerlangsung && sesiHariIni.Status != entity.SesiDiperpanjang) {
		return nil, ErrSesiTidakBisaDiperpanjang
	}

	jamSekarangMenit, err := parseJamKeMenit(sesiHariIni.JamSelesaiRencana)
	if err != nil {
		return nil, err
	}
	if jamBaruMenit <= jamSekarangMenit {
		return nil, ErrJamPerpanjangTidakValid
	}

	sesi, err := u.repo.PerpanjangSesi(ctx, sesiHariIni.ID, req.JamSelesaiBaru)
	if err != nil {
		return nil, err
	}
	if sesi == nil {
		return nil, ErrSesiTidakBisaDiperpanjang
	}
	return toSesiAktifDTO(sesi)
}

func (u *operasionalUsecase) AkhiriSesiLebihAwal(ctx context.Context) (*entity.SesiAktifDTO, error) {
	sesiHariIni, err := u.repo.GetSesiHariIni(ctx)
	if err != nil {
		return nil, err
	}
	if sesiHariIni == nil || sesiHariIni.Status != entity.SesiBerlangsung {
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

func (u *operasionalUsecase) UpdatePendaftaran(ctx context.Context, userID string, isOpen bool) error {
	return u.repo.UpdatePengaturanPendaftaran(ctx, isOpen, &userID)
}
