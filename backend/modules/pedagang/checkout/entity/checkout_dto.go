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
}

type SubmitCheckoutRequest struct {
	Omset int64 `json:"omset" validate:"required,gt=0"`
}

type SubmitCheckoutResponse struct {
	Message    string    `json:"message"`
	CheckOutAt time.Time `json:"check_out_at"`
	Omset      int64     `json:"omset"`
}