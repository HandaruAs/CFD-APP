package entity

import "time"

// KecamatanDTO dipakai buat dropdown "Pilih Kecamatan" di form nomor stand.
type KecamatanDTO struct {
	ID   string `json:"id"`
	Nama string `json:"nama"`
}

// JalanDTO dipakai buat nampilin daftar jalan + sisa kapasitasnya di 1 kecamatan,
// untuk sesi CFD yang lagi aktif.
type JalanDTO struct {
	ID        string `json:"id"`
	KodeJalan string `json:"kodeJalan"`
	NamaJalan string `json:"namaJalan"`
	Kapasitas int    `json:"kapasitas"`
	Terisi    int    `json:"terisi"`
	Sisa      int    `json:"sisa"`
	Penuh     bool   `json:"penuh"`
}

type ClaimLapakRequest struct {
	JalanID string `json:"jalan_id" validate:"required"`
}

type ClaimLapakResponse struct {
	NomorLapak string    `json:"nomor_lapak"`
	NamaJalan  string    `json:"nama_jalan"`
	ClaimedAt  time.Time `json:"claimed_at"`
}

// StatusLapakResponse dipakai buat cek apakah pedagang yang lagi login udah
// klaim lapak di sesi aktif sekarang -- biar frontend tau harus nampilin form
// klaim, atau langsung nampilin nomor lapak yang udah didapet.
type StatusLapakResponse struct {
	SudahKlaim    bool       `json:"sudah_klaim"`
	NomorLapak    *string    `json:"nomor_lapak,omitempty"`
	NamaJalan     *string    `json:"nama_jalan,omitempty"`
	NamaKecamatan *string    `json:"nama_kecamatan,omitempty"`
	ClaimedAt     *time.Time `json:"claimed_at,omitempty"`
}