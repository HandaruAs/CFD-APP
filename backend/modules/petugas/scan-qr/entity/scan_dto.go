package entity

import "time"

// ============================================================
// SCAN QR - REQUEST & RESPONSE
// ============================================================

type VerifyQRRequest struct {
    QRCode string `json:"qr_code" validate:"required"`
}

type VerifyQRResponse struct {
    Valid         bool               `json:"valid"`
    Message       string             `json:"message"`
    Pedagang      *PedagangDetailDTO `json:"pedagang,omitempty"`
    SudahCheckIn  bool               `json:"sudah_check_in"`
    CheckInAt     *time.Time         `json:"check_in_at,omitempty"`
}

type PedagangDetailDTO struct {
    ID                string `json:"id"`
    NamaUsaha         string `json:"nama_usaha"`
    Pemilik           string `json:"pemilik"`
    Inisial           string `json:"inisial"`
    Kategori          string `json:"kategori"`
    LokasiLapak       string `json:"lokasi_lapak"`
    StatusPendaftaran string `json:"status_pendaftaran"`
    Nik               string `json:"nik,omitempty"`
    Alamat            string `json:"alamat,omitempty"`
    PerkiraanHarga    string `json:"perkiraan_harga,omitempty"`
}

type CheckInRequest struct {
    PedagangID string `json:"pedagang_id" validate:"required"`
    Catatan    string `json:"catatan,omitempty"`
}

type CheckInResponse struct {
    Success    bool      `json:"success"`
    Message    string    `json:"message"`
    CheckInAt  time.Time `json:"check_in_at"`
    PedagangID string    `json:"pedagang_id"`
    NamaUsaha  string    `json:"nama_usaha"`
}

type RiwayatScanItem struct {
    Waktu      string `json:"waktu"`
    NamaUsaha  string `json:"nama_usaha"`
    Status     string `json:"status"` // "berhasil" | "gagal"
    PedagangID string `json:"pedagang_id,omitempty"`
}

type RiwayatScanResponse struct {
    Riwayat []RiwayatScanItem `json:"riwayat"`
    Total   int               `json:"total"`
}