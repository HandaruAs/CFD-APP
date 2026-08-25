package usecase

import (
    "context"
    "fmt"
    "time"

    "cfd-backend/modules/petugas/scan-qr/entity"
    "cfd-backend/modules/petugas/scan-qr/repository"
    "github.com/google/uuid"
)

type ScanUsecase interface {
    VerifyQRCode(ctx context.Context, qrCode string, petugasID string) (*entity.VerifyQRResponse, error)
    CheckInPedagang(ctx context.Context, pedagangID, petugasID, catatan string) (*entity.CheckInResponse, error)
    GetRiwayatScan(ctx context.Context, petugasID string) (*entity.RiwayatScanResponse, error)
}

type scanUsecase struct {
    repo repository.ScanRepository
}

func NewScanUsecase(repo repository.ScanRepository) ScanUsecase {
    return &scanUsecase{repo: repo}
}

func (u *scanUsecase) VerifyQRCode(ctx context.Context, qrCode string, petugasID string) (*entity.VerifyQRResponse, error) {
    // 1. Cari pedagang berdasarkan QR code (ID pedagang)
    pedagang, err := u.repo.GetPedagangByID(ctx, qrCode)
    if err != nil {
        return nil, err
    }
    if pedagang == nil {
        return &entity.VerifyQRResponse{
            Valid:   false,
            Message: "QR code tidak dikenali",
        }, nil
    }

    // 2. Cek sesi CFD aktif hari ini
    session, err := u.repo.GetActiveSessionToday(ctx, time.Now())
    if err != nil {
        return nil, err
    }
    if session == nil {
        return &entity.VerifyQRResponse{
            Valid:   false,
            Message: "Tidak ada sesi CFD yang sedang berlangsung hari ini",
        }, nil
    }

    // 3. Cek sudah check-in belum
    existing, err := u.repo.GetKehadiranByPedagangAndSession(ctx, pedagang.ID, session.ID)
    if err != nil {
        return nil, err
    }

    sudahCheckIn := existing != nil
    var checkInAt *time.Time
    if sudahCheckIn {
        checkInAt = &existing.CheckInAt
    }

    // 4. Siapkan response
    detail := &entity.PedagangDetailDTO{
        ID:                pedagang.ID,
        NamaUsaha:         getString(pedagang.NamaUsaha),
        Pemilik:           pedagang.Pemilik,
        Inisial:           getInisial(pedagang.Pemilik),
        Kategori:          getString(pedagang.JenisDagangan),
        LokasiLapak:       getString(pedagang.Alamat),
        Nik:               getString(pedagang.NIK),
        Alamat:            getString(pedagang.Alamat),
        PerkiraanHarga:    getString(pedagang.PerkiraanHarga),
    }

    return &entity.VerifyQRResponse{
        Valid:        true,
        Message:      "QR Code terverifikasi",
        Pedagang:     detail,
        SudahCheckIn: sudahCheckIn,
        CheckInAt:    checkInAt,
    }, nil
}

func (u *scanUsecase) CheckInPedagang(ctx context.Context, pedagangID, petugasID, catatan string) (*entity.CheckInResponse, error) {
    // 1. Cek pedagang
    pedagang, err := u.repo.GetPedagangByID(ctx, pedagangID)
    if err != nil {
        return nil, err
    }
    if pedagang == nil {
        return nil, fmt.Errorf("pedagang tidak ditemukan")
    }

    // 2. Cek sesi aktif
    session, err := u.repo.GetActiveSessionToday(ctx, time.Now())
    if err != nil {
        return nil, err
    }
    if session == nil {
        return nil, fmt.Errorf("tidak ada sesi CFD aktif hari ini")
    }

    // 3. Cek sudah check-in
    existing, err := u.repo.GetKehadiranByPedagangAndSession(ctx, pedagangID, session.ID)
    if err != nil {
        return nil, err
    }
    if existing != nil {
        return nil, fmt.Errorf("pedagang sudah check-in pada pukul %s", existing.CheckInAt.Format("15:04"))
    }

    // 4. Simpan check-in
    now := time.Now()
    kehadiran := &entity.KehadiranPedagang{
        ID:          uuid.New().String(),
        PedagangID:  pedagangID,
        SessionID:   session.ID,
        CheckInAt:   now,
        ScannedBy:   petugasID,
        Catatan:     stringPtr(catatan),
    }

    if err := u.repo.CreateKehadiran(ctx, kehadiran); err != nil {
        return nil, err
    }

    return &entity.CheckInResponse{
        Success:    true,
        Message:    "Check-in berhasil dicatat",
        CheckInAt:  now,
        PedagangID: pedagangID,
        NamaUsaha:  getString(pedagang.NamaUsaha),
    }, nil
}

func (u *scanUsecase) GetRiwayatScan(ctx context.Context, petugasID string) (*entity.RiwayatScanResponse, error) {
    today := time.Now()
    items, err := u.repo.GetRiwayatScanHariIni(ctx, petugasID, today)
    if err != nil {
        return nil, err
    }

    riwayat := make([]entity.RiwayatScanItem, 0, len(items))
    for _, item := range items {
        riwayat = append(riwayat, entity.RiwayatScanItem{
            Waktu:      item.CheckInAt.Format("15:04"),
            NamaUsaha:  item.NamaUsaha,
            Status:     "berhasil",
            PedagangID: item.PedagangID,
        })
    }

    return &entity.RiwayatScanResponse{
        Riwayat: riwayat,
        Total:   len(riwayat),
    }, nil
}

// Helper functions
func getString(s *string) string {
    if s == nil {
        return ""
    }
    return *s
}

func stringPtr(s string) *string {
    if s == "" {
        return nil
    }
    return &s
}

func getInisial(name string) string {
    if name == "" {
        return "??"
    }
    parts := splitName(name)
    if len(parts) == 0 {
        return "??"
    }
    if len(parts) == 1 {
        return string(parts[0][0])
    }
    return string(parts[0][0]) + string(parts[1][0])
}

func splitName(name string) []string {
    var parts []string
    current := ""
    for _, ch := range name {
        if ch == ' ' {
            if current != "" {
                parts = append(parts, current)
                current = ""
            }
        } else {
            current += string(ch)
        }
    }
    if current != "" {
        parts = append(parts, current)
    }
    return parts
}