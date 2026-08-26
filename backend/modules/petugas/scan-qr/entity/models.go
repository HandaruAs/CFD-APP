package entity

import "time"

// PedagangProfile - model untuk tabel pedagang_profiles
type PedagangProfile struct {
    ID               string     `db:"id"`
    UserID           string     `db:"user_id"`
    NIK              *string    `db:"nik"`
    NamaUsaha        *string    `db:"nama_usaha"`
    JenisDagangan    *string    `db:"jenis_dagangan"`
    Alamat           *string    `db:"alamat"`
    StatusVerifikasi string     `db:"status_verifikasi"`
    Catatan          *string    `db:"catatan"`
    VerifiedBy       *string    `db:"verified_by"`
    VerifiedAt       *time.Time `db:"verified_at"`
    PerkiraanHarga   *string    `db:"perkiraan_harga"`
    Phone            *string    `db:"phone"`
    SubmittedAt      *time.Time `db:"submitted_at"`
    CreatedAt        time.Time  `db:"created_at"`
    UpdatedAt        time.Time  `db:"updated_at"`
    DeletedAt        *time.Time `db:"deleted_at"`

    Pemilik string `db:"pemilik"`
}

// KehadiranPedagang - model untuk tabel kehadiran_pedagang
type KehadiranPedagang struct {
    ID          string     `db:"id"`
    PedagangID  string     `db:"pedagang_id"`
    SessionID   string     `db:"session_id"`
    CheckInAt   time.Time  `db:"check_in_at"`
    ScannedBy   string     `db:"scanned_by"`
    Catatan     *string    `db:"catatan"`
    CreatedAt   time.Time  `db:"created_at"`
    UpdatedAt   time.Time  `db:"updated_at"`
    DeletedAt   *time.Time `db:"deleted_at"`
}

// KehadiranWithPedagang - join kehadiran dengan pedagang_profiles
type KehadiranWithPedagang struct {
    KehadiranPedagang
    NamaUsaha     string `db:"nama_usaha"`
    Pemilik       string `db:"pemilik"`
    Inisial       string `db:"inisial"`
    JenisDagangan string `db:"jenis_dagangan"`
    LokasiLapak   string `db:"lokasi_lapak"`
}

// CfdSession - model untuk tabel cfd_sessions (disetarakan dengan migrasi 26)
type CfdSession struct {
    ID                string     `db:"id"`
    NamaSesi          string     `db:"nama_sesi"`          // baru
    Tanggal           time.Time  `db:"tanggal"`
    JamMulai          time.Time  `db:"jam_mulai"`
    JamSelesaiRencana time.Time  `db:"jam_selesai"`        // di migrasi 26 kolom ini bernama jam_selesai
    JamSelesaiAktual  *time.Time `db:"jam_selesai_aktual"`
    Status            string     `db:"status"`             // VARCHAR: 'aktif', 'ditutup', 'selesai', 'dibatalkan'
    CreatedBy         *string    `db:"created_by"`
    IsActive          bool       `db:"is_active"`          // baru
    CreatedAt         time.Time  `db:"created_at"`
    UpdatedAt         time.Time  `db:"updated_at"`
    DeletedAt         *time.Time `db:"deleted_at"`
}