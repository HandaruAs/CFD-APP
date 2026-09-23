package entity

import "time"

// KecamatanDTO dipakai buat dropdown "Pilih Kecamatan" di form nomor stand
// (cuma muncul kalau mode == "kecamatan").
type KecamatanDTO struct {
	ID   string `json:"id"`
	Nama string `json:"nama"`
}

// JalanDTO dipakai buat nampilin daftar jalan + sisa kapasitasnya di 1 kecamatan,
// untuk sesi CFD yang lagi aktif. Sekarang cuma buat preview info (mis. "kecamatan
// ini masih ada sisa X lapak"), BUKAN buat pedagang milih jalan manual lagi.
type JalanDTO struct {
	ID        string `json:"id"`
	KodeJalan string `json:"kodeJalan"`
	NamaJalan string `json:"namaJalan"`
	Kapasitas int    `json:"kapasitas"`
	Terisi    int    `json:"terisi"`
	Sisa      int    `json:"sisa"`
	Penuh     bool   `json:"penuh"`
}

// ClaimLapakResponse -- pedagang gak lagi kirim apa-apa buat klaim (gak ada
// request body sama sekali). Jalan & nomor lapak-nya diambil dari pool
// lapak_slot yang udah disiapin petugas lewat "Acak Lapak" (lihat
// modules/petugas/acak-lapak) -- BUKAN diacak dadakan lagi kayak dulu.
type ClaimLapakResponse struct {
	NomorLapak    string    `json:"nomor_lapak"`
	NamaJalan     string    `json:"nama_jalan"`
	NamaKecamatan string    `json:"nama_kecamatan"`
	NamaRuas      string    `json:"nama_ruas"` // kosong kalau jalannya belum dibagi ruas
	ClaimedAt     time.Time `json:"claimed_at"`
}

// StatusLapakResponse dipakai buat cek apakah pedagang yang lagi login udah
// klaim lapak di sesi aktif sekarang -- biar frontend tau harus nampilin form
// klaim, atau langsung nampilin nomor lapak yang udah didapet.
type StatusLapakResponse struct {
	SudahKlaim    bool       `json:"sudah_klaim"`
	SesiAktif     bool       `json:"sesi_aktif"`
	PesanSesi     *string    `json:"pesan_sesi,omitempty"`
	NomorLapak    *string    `json:"nomor_lapak,omitempty"`
	NamaJalan     *string    `json:"nama_jalan,omitempty"`
	NamaKecamatan *string    `json:"nama_kecamatan,omitempty"`
	NamaRuas      *string    `json:"nama_ruas,omitempty"`
	ClaimedAt     *time.Time `json:"claimed_at,omitempty"`
}