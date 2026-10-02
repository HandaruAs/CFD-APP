package entity

import "time"

// LokasiRingkas: sebaran titik lokasi sebuah event + sisa tempat di titik itu.
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
	SisaLama     int        `json:"-"` // sisa jatah lama di tingkat event
	SisaBaru     int        `json:"-"` // sisa jatah baru di tingkat event
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
	QRCode        string     `json:"qrCode"` // id keikutsertaan: QR unik per event, dipindai petugas saat check-in

	PendaftaranBukaAt  *time.Time `json:"-"`
	PendaftaranTutupAt *time.Time `json:"-"`
	MulaiAt            time.Time  `json:"-"`
}

// LapakSisa: sisa tempat fisik per titik lokasi (view v_event_lapak_terisi).
type LapakSisa struct {
	NamaKecamatan *string
	NamaJalan     string
	NamaRuas      string
	Sisa          int
}

// DataCheckout: isi halaman Check-out pedagang untuk SATU event -- event
// yang check-in-nya belum ditutup (yang sudah selesai didahulukan), atau
// checkout terakhir hari ini kalau semua sudah selesai.
type DataCheckout struct {
	PesertaID     string  `json:"pesertaId"`
	EventID       string  `json:"eventId"`
	NamaEvent     string  `json:"namaEvent"`
	Tanggal       string  `json:"tanggal"`
	JamMulai      string  `json:"jamMulai"`
	JamSelesai    string  `json:"jamSelesai"`
	NamaKecamatan *string `json:"namaKecamatan"`
	NamaJalan     string  `json:"namaJalan"`
	NamaRuas      string  `json:"namaRuas"`
	Nomor         int     `json:"nomor"`

	NIK           string `json:"nik"`
	NamaLengkap   string `json:"namaLengkap"`
	TanggalLahir  string `json:"tanggalLahir"`
	NamaUsaha     string `json:"namaUsaha"`
	KategoriUsaha string `json:"kategoriUsaha"`
	JenisLapak    string `json:"jenisLapak"`

	SudahCheckIn  bool       `json:"sudahCheckIn"`
	SudahCheckOut bool       `json:"sudahCheckOut"`
	CheckInAt     *time.Time `json:"checkInAt"`
	CheckOutAt    *time.Time `json:"checkOutAt"`
	Omset         *int64     `json:"omset"`

	// JamSelesaiSesi: tanggal + jam selesai event (WIB), untuk hitung mundur.
	JamSelesaiSesi time.Time `json:"jamSelesaiSesi"`
	// SesiSudahSelesai: sumber kebenaran boleh/tidaknya checkout sekarang.
	SesiSudahSelesai bool `json:"sesiSudahSelesai"`
	// WajibCheckout: check-in di event yang SUDAH selesai tapi omset belum
	// diisi. Selama true, pedagang tidak bisa ikut / check-in event lain.
	WajibCheckout bool `json:"wajibCheckout"`

	Status      string `json:"-"`
	StatusEvent string `json:"-"`
}

type CheckoutRequest struct {
	Omset int64 `json:"omset"`
}