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

	// Dipakai background job (scheduler) + endpoint pengaturan jadwal.
	GetJadwalHariIni(ctx context.Context, hari entity.Hari) (*entity.JadwalMingguan, error)
	AutoSelesaikanSesi(ctx context.Context, id, jamSelesaiRencana string) (*entity.Sesi, error)
	ListJadwalMingguan(ctx context.Context) ([]entity.JadwalMingguan, error)
	UpdateJadwalMingguan(ctx context.Context, hari entity.Hari, jamMulai, jamSelesaiRencana string, isActive bool, updatedBy *string) (*entity.JadwalMingguan, error)
}

type OperasionalUsecase interface {
	GetStatusOperasional(ctx context.Context) (*entity.StatusOperasionalResponse, error)
	SimpanSesi(ctx context.Context, userID string, req *entity.UpdateSesiRequest) (*entity.SesiAktifDTO, error)
	PerpanjangSesi(ctx context.Context, req *entity.PerpanjangSesiRequest) (*entity.SesiAktifDTO, error)
	AkhiriSesiLebihAwal(ctx context.Context) (*entity.SesiAktifDTO, error)
	UpdatePendaftaran(ctx context.Context, userID string, isOpen bool) error

	// ListJadwalMingguan & UpdateJadwalMingguan buat endpoint pengaturan
	// jadwal default. TickJadwalOtomatis dipanggil background job
	// (goroutine di main.go) tiap beberapa saat -- INI YANG BIKIN sesi
	// otomatis mulai & otomatis selesai sesuai jadwal, tanpa petugas klik
	// apa-apa.
	ListJadwalMingguan(ctx context.Context) ([]entity.JadwalMingguanDTO, error)
	UpdateJadwalMingguan(ctx context.Context, userID string, req *entity.UpdateJadwalMingguanRequest) (*entity.JadwalMingguanDTO, error)
	TickJadwalOtomatis(ctx context.Context) error
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
//
// Aktif = jam_selesai_aktual IS NULL. Ini penanda satu-satunya buat "sesi
// ini masih jalan" -- BUKAN Status, karena Status 'diperpanjang' dipakai
// baik pas sesi masih jalan (abis di-Perpanjang) MAUPUN pas udah kelar
// (buat riwayat).
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

	aktif := s.JamSelesaiAktual == nil

	nowMenit := 0
	if aktif {
		now := time.Now()
		nowMenit = now.Hour()*60 + now.Minute()
	}

	sisaMenit := selesaiMenit - nowMenit
	if sisaMenit < 0 {
		sisaMenit = 0
	}
	if !aktif {
		// sesi udah selesai/diakhiri -> nggak ada lagi "sisa waktu"
		sisaMenit = 0
	}

	return &entity.SesiAktifDTO{
		ID:                s.ID,
		Tanggal:           s.Tanggal,
		JamMulai:          s.JamMulai,
		JamSelesaiRencana: s.JamSelesaiRencana,
		Status:            string(s.Status),
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
	if sesiHariIni == nil || sesiHariIni.JamSelesaiAktual != nil {
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
	if sesiHariIni == nil || sesiHariIni.JamSelesaiAktual != nil {
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
		// valid
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

// TickJadwalOtomatis INI YANG BIKIN JAM OPERASIONAL BENERAN "REAL-TIME" --
// dipanggil berulang-ulang sama background job (lihat main.go), bukan
// dipicu klik-an petugas. Tiap kali dipanggil, dia ngecek 2 hal yang
// independen satu sama lain:
//
//  1. Sesi hari ini (kalau ada & masih aktif) -- udah lewat jam
//     jam_selesai_rencana-nya belum? Kalau udah, tutup otomatis.
//     Ini jalan terlepas dari jadwal mingguan, soalnya sesi yang udah
//     kadung dibuat (manual atau otomatis) harus tetap ditutup pas
//     waktunya, walau jadwal mingguannya kebetulan lagi dimatiin.
//  2. Kalau belum ada sesi buat hari ini SAMA SEKALI, dan sekarang lagi
//     ada di jendela waktu [jam_mulai, jam_selesai_rencana) menurut
//     jadwal mingguan hari ini yang aktif -> otomatis BIKIN sesi baru
//     (status 'berlangsung', created_by NULL karena dibikin sistem,
//     bukan petugas).
func (u *operasionalUsecase) TickJadwalOtomatis(ctx context.Context) error {
	now := time.Now()
	nowMenit := now.Hour()*60 + now.Minute()

	sesiHariIni, err := u.repo.GetSesiHariIni(ctx)
	if err != nil {
		return err
	}

	// 1. Auto-tutup sesi yang udah lewat jam selesai rencananya.
	if sesiHariIni != nil && sesiHariIni.JamSelesaiAktual == nil {
		selesaiMenit, err := parseJamKeMenit(sesiHariIni.JamSelesaiRencana)
		if err != nil {
			return err
		}
		if nowMenit >= selesaiMenit {
			if _, err := u.repo.AutoSelesaikanSesi(ctx, sesiHariIni.ID, sesiHariIni.JamSelesaiRencana); err != nil {
				return err
			}
		}
		return nil // sesi hari ini udah ada -> nggak perlu cek langkah 2
	}
	if sesiHariIni != nil {
		return nil // sesi hari ini udah ada (walau udah nggak aktif) -> jangan bikin baru
	}

	// 2. Belum ada sesi hari ini -> cek jadwal mingguan, auto-mulai kalau
	// sekarang udah masuk jendela waktunya.
	hari := entity.HariDariWeekday(now.Weekday())
	jadwal, err := u.repo.GetJadwalHariIni(ctx, hari)
	if err != nil {
		return err
	}
	if jadwal == nil {
		return nil // bukan hari CFD (atau jadwalnya lagi dimatiin)
	}

	mulaiMenit, err := parseJamKeMenit(jadwal.JamMulai)
	if err != nil {
		return err
	}
	selesaiMenit, err := parseJamKeMenit(jadwal.JamSelesaiRencana)
	if err != nil {
		return err
	}
	if nowMenit < mulaiMenit || nowMenit >= selesaiMenit {
		return nil // belum waktunya, atau jendelanya udah kelewat hari ini
	}

	_, err = u.repo.UpsertSesiHariIni(ctx, jadwal.JamMulai, jadwal.JamSelesaiRencana, nil)
	return err
}
