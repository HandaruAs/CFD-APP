package usecase

import (
	"context"
	"errors"
	"strings"
	"time"

	"cfd-backend/modules/petugas/event-checkin/entity"
	"cfd-backend/modules/petugas/event-checkin/repository"
	"cfd-backend/modules/shared/eventaturan"

	"github.com/google/uuid"
)

var (
	ErrTidakAdaEventHariIni = errors.New("pedagang ini tidak terdaftar di event mana pun hari ini")
	ErrPilihKartu           = errors.New("pedagang ini ikut lebih dari satu event yang sedang membuka check-in, minta pedagang menunjukkan QR di kartu event yang dimaksud")
)

type CheckInRepository interface {
	GetPeserta(ctx context.Context, pesertaID string) (*entity.PesertaScan, error)
	ListPesertaHariIni(ctx context.Context, pedagangID string) ([]entity.PesertaScan, error)
	AdaPedagang(ctx context.Context, id string) (bool, error)
	CheckIn(ctx context.Context, pesertaID, petugasID string, catatan *string, now time.Time) error
	CheckInTerbukaLain(ctx context.Context, pedagangID, kecualiPesertaID string) ([]repository.CheckInTerbuka, error)
	RiwayatHariIni(ctx context.Context, petugasID string) ([]entity.RiwayatItem, error)
}

type CheckInUsecase interface {
	Periksa(ctx context.Context, qrCode string) (*entity.PesertaScan, error)
	CheckIn(ctx context.Context, petugasID string, req *entity.CheckInRequest) (*entity.PesertaScan, error)
	Riwayat(ctx context.Context, petugasID string) ([]entity.RiwayatItem, error)
}

type checkInUsecase struct {
	repo CheckInRepository
	now  func() time.Time
}

func NewCheckInUsecase(repo CheckInRepository) CheckInUsecase {
	return &checkInUsecase{repo: repo, now: time.Now}
}

// alasan: kenapa peserta ini tidak bisa check-in sekarang ("" = bisa).
func (u *checkInUsecase) alasan(ctx context.Context, p *entity.PesertaScan) (string, error) {
	if a := eventaturan.AlasanPesertaTidakBisaCheckIn(p.Status, p.CheckInAt); a != "" {
		return a, nil
	}
	if a := eventaturan.AlasanTidakBisaCheckIn(p.StatusEvent, p.MulaiAt, p.SelesaiAt, u.now()); a != "" {
		return a, nil
	}
	terbuka, err := u.repo.CheckInTerbukaLain(ctx, p.PedagangID, p.PesertaID)
	if err != nil {
		return "", err
	}
	if err := repository.PenghalangCheckIn(terbuka, u.now()); err != nil {
		return kalimat(err.Error()), nil
	}
	return "", nil
}

// kalimat: huruf pertama kapital + titik, untuk ditampilkan ke petugas.
func kalimat(s string) string {
	if s == "" {
		return s
	}
	s = strings.ToUpper(s[:1]) + s[1:]
	if !strings.HasSuffix(s, ".") {
		s += "."
	}
	return s
}

func (u *checkInUsecase) lengkapi(ctx context.Context, p *entity.PesertaScan) (*entity.PesertaScan, error) {
	a, err := u.alasan(ctx, p)
	if err != nil {
		return nil, err
	}
	if a != "" {
		p.Alasan = &a
		p.BisaCheckIn = false
	} else {
		p.Alasan = nil
		p.BisaCheckIn = true
	}
	return p, nil
}

// Periksa membaca isi QR. Isi QR yang baru adalah id keikutsertaan (kartu
// event). QR lama berisi id pedagang -- masih diterima selama aplikasi
// mobile belum disesuaikan: dicari keikutsertaannya di event hari ini.
func (u *checkInUsecase) Periksa(ctx context.Context, qrCode string) (*entity.PesertaScan, error) {
	id, err := uuid.Parse(strings.TrimSpace(qrCode))
	if err != nil {
		return nil, repository.ErrPesertaTidakDitemukan
	}

	p, err := u.repo.GetPeserta(ctx, id.String())
	if err == nil {
		return u.lengkapi(ctx, p)
	}
	if !errors.Is(err, repository.ErrPesertaTidakDitemukan) {
		return nil, err
	}

	// QR lama: id pedagang.
	ada, err := u.repo.AdaPedagang(ctx, id.String())
	if err != nil {
		return nil, err
	}
	if !ada {
		return nil, repository.ErrPesertaTidakDitemukan
	}
	list, err := u.repo.ListPesertaHariIni(ctx, id.String())
	if err != nil {
		return nil, err
	}
	if len(list) == 0 {
		return nil, ErrTidakAdaEventHariIni
	}
	var buka []entity.PesertaScan
	for i := range list {
		if eventaturan.AlasanTidakBisaCheckIn(list[i].StatusEvent, list[i].MulaiAt, list[i].SelesaiAt, u.now()) == "" {
			buka = append(buka, list[i])
		}
	}
	switch len(buka) {
	case 0:
		// Tidak ada yang sedang membuka check-in: tampilkan event terdekat
		// beserta alasannya, supaya petugas tahu kenapa ditolak.
		return u.lengkapi(ctx, &list[0])
	case 1:
		return u.lengkapi(ctx, &buka[0])
	default:
		return nil, ErrPilihKartu
	}
}

func (u *checkInUsecase) CheckIn(ctx context.Context, petugasID string, req *entity.CheckInRequest) (*entity.PesertaScan, error) {
	id, err := uuid.Parse(strings.TrimSpace(req.PesertaID))
	if err != nil {
		return nil, repository.ErrPesertaTidakDitemukan
	}
	var catatan *string
	if req.Catatan != nil && strings.TrimSpace(*req.Catatan) != "" {
		c := strings.TrimSpace(*req.Catatan)
		catatan = &c
	}
	if err := u.repo.CheckIn(ctx, id.String(), petugasID, catatan, u.now()); err != nil {
		return nil, err
	}
	p, err := u.repo.GetPeserta(ctx, id.String())
	if err != nil {
		return nil, err
	}
	return u.lengkapi(ctx, p)
}

func (u *checkInUsecase) Riwayat(ctx context.Context, petugasID string) ([]entity.RiwayatItem, error) {
	return u.repo.RiwayatHariIni(ctx, petugasID)
}