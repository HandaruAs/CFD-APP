package entity

import "time"

// DataCheckoutResponse dipakai buat ngisi form "Cek-out Pedagang" -- gabungan
// data profil pedagang, lokasi lapak yang udah diklaim (dari lapak_klaim),
// dan status kehadiran hari ini (dari kehadiran_pedagang) untuk sesi CFD
// yang lagi aktif.
type DataCheckoutResponse struct {
	Kecamatan     string `json:"kecamatan"`
	NamaJalan     string `json:"namaJalan"`
	NomorStan     string `json:"nomorStan"`
	NIK           string `json:"nik"`
	NamaLengkap   string `json:"namaLengkap"`
	TanggalLahir  string `json:"tanggalLahir"`
	NamaUsaha     string `json:"namaUsaha"`
	KategoriUsaha string `json:"kategoriUsaha"`
	JenisLapak    string `json:"jenisLapak"`
	SudahCheckIn  bool   `json:"sudahCheckIn"`
	SudahCheckOut bool   `json:"sudahCheckOut"`
	Omset         *int64 `json:"omset,omitempty"`

	// JamSelesaiSesi = jam selesai sesi CFD hari ini (tanggal hari ini +
	// cfd_sessions.jam_selesai), dikirim sebagai timestamp lengkap (bukan
	// cuma "17:00:00") biar aman di-parse `new Date(...)` di frontend
	// tanpa ambigu. Nil kalau sesi hari ini gak ketemu jam_selesai-nya.
	JamSelesaiSesi *time.Time `json:"jamSelesaiSesi,omitempty"`
	// SesiSudahSelesai = sumber kebenaran boleh/tidaknya cek-out sekarang.
	// Frontend sebaiknya pakai field ini buat nyalain tombol submit,
	// BUKAN ngitung sendiri dari jam client (bisa beda sama jam server).
	SesiSudahSelesai bool `json:"sesiSudahSelesai"`
}

type SubmitCheckoutRequest struct {
	Omset int64 `json:"omset" validate:"required,gt=0"`
}

type SubmitCheckoutResponse struct {
	Message    string    `json:"message"`
	CheckOutAt time.Time `json:"check_out_at"`
	Omset      int64     `json:"omset"`
}