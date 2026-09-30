package entity

import "time"

// LokasiRingkas: sebaran titik lokasi sebuah event + sisa kuota untuk
// kategori pedagang yang sedang login.
type LokasiRingkas struct {
	NamaKecamatan *string `json:"namaKecamatan"`
	NamaJalan     string  `json:"namaJalan"`
	NamaRuas      string  `json:"namaRuas"`
	Sisa          int     `json:"sisa"`
}

// EventTersedia: 1 kartu di langkah "Pilih Event".
type EventTersedia struct {
	ID                 string          `json:"id"`
	Nama               string          `json:"nama"`
	Tanggal            string          `json:"tanggal"`
	JamMulai           string          `json:"jamMulai"`
	JamSelesai         string          `json:"jamSelesai"`
	Keterangan         *string         `json:"keterangan"`
	StatusPendaftaran  string          `json:"statusPendaftaran"` // belum_dibuka | dibuka | ditutup
	PendaftaranBukaAt  *time.Time      `json:"pendaftaranBukaAt"`
	PendaftaranTutupAt *time.Time      `json:"pendaftaranTutupAt"`
	KuotaLamaDilepas   bool            `json:"kuotaLamaDilepas"`
	SisaUntukSaya      int             `json:"sisaUntukSaya"`
	Lokasi             []LokasiRingkas `json:"lokasi"`
	StatusSaya         *string         `json:"statusSaya"` // nil = belum ikut; terdaftar/check_in/check_out/batal/tidak_hadir
	BisaIkut           bool            `json:"bisaIkut"`

	Status       string     `json:"-"`
	MulaiAt      time.Time  `json:"-"`
	LepasKuotaAt *time.Time `json:"-"`
}

type EventTersediaResponse struct {
	Kategori string          `json:"kategori"` // lama | baru
	Events   []EventTersedia `json:"events"`
}

// Keikutsertaan: 1 kartu event yang diikuti pedagang (halaman Check-in/out
// dan hasil "Ikut event").
type Keikutsertaan struct {
	ID            string     `json:"id"`
	EventID       string     `json:"eventId"`
	NamaEvent     string     `json:"namaEvent"`
	Tanggal       string     `json:"tanggal"`
	JamMulai      string     `json:"jamMulai"`
	JamSelesai    string     `json:"jamSelesai"`
	StatusEvent   string     `json:"statusEvent"`
	NamaKecamatan *string    `json:"namaKecamatan"`
	NamaJalan     string     `json:"namaJalan"`
	NamaRuas      string     `json:"namaRuas"`
	Nomor         int        `json:"nomor"`
	Kategori      string     `json:"kategori"`
	KuotaDipakai  string     `json:"kuotaDipakai"`
	Status        string     `json:"status"`
	AcakAt        time.Time  `json:"acakAt"`
	CheckInAt     *time.Time `json:"checkInAt"`
	CheckOutAt    *time.Time `json:"checkOutAt"`
	BisaBatal     bool       `json:"bisaBatal"`
	QRCode        string     `json:"qrCode"` // id pedagang, sama dengan QR yang dipindai petugas

	PendaftaranBukaAt  *time.Time `json:"-"`
	PendaftaranTutupAt *time.Time `json:"-"`
	MulaiAt            time.Time  `json:"-"`
}

// LapakSisa: sisa kuota lama/baru per titik lokasi (dari view
// v_event_lapak_kuota), bahan hitung sisa sesuai kategori pedagang.
type LapakSisa struct {
	NamaKecamatan *string
	NamaJalan     string
	NamaRuas      string
	SisaLama      int
	SisaBaru      int
}
