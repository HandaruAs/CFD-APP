package entity

import "time"

// LokasiInfo: ringkasan titik lokasi event per jalan (tanpa data pribadi).
type LokasiInfo struct {
	Kecamatan  *string `json:"kecamatan"`
	NamaJalan  string  `json:"namaJalan"`
	JumlahRuas int     `json:"jumlahRuas"`
	Kapasitas  int     `json:"kapasitas"`
}

// EventInfo: ringkasan 1 event untuk beranda publik dan dashboard petugas.
// Kuota per event: sisa = kuota total - pedagang terdaftar (tidak batal).
type EventInfo struct {
	ID                string       `json:"id"`
	Nama              string       `json:"nama"`
	Tanggal           string       `json:"tanggal"`
	JamMulai          string       `json:"jamMulai"`
	JamSelesai        string       `json:"jamSelesai"`
	Status            string       `json:"status"`            // terjadwal | berjalan | selesai | dibatalkan
	StatusPendaftaran string       `json:"statusPendaftaran"` // belum_dibuka | dibuka | ditutup
	SisaMenit         int          `json:"sisaMenit"`         // terisi kalau berjalan
	TotalMenit        int          `json:"totalMenit"`
	KuotaTotal        int          `json:"kuotaTotal"`
	KuotaLama         int          `json:"kuotaLama"`
	KuotaBaru         int          `json:"kuotaBaru"`
	Terisi            int          `json:"terisi"`
	Sisa              int          `json:"sisa"`
	CheckIn           int          `json:"checkIn"`
	CheckOut          int          `json:"checkOut"`
	Lokasi            []LokasiInfo `json:"lokasi"`

	StatusAsli         string     `json:"-"`
	MulaiAt            time.Time  `json:"-"`
	SelesaiAt          time.Time  `json:"-"`
	PendaftaranBukaAt  *time.Time `json:"-"`
	PendaftaranTutupAt *time.Time `json:"-"`
}

// EventPilihan: 1 opsi di dropdown filter event (laporan petugas).
type EventPilihan struct {
	ID         string `json:"id"`
	Nama       string `json:"nama"`
	Tanggal    string `json:"tanggal"`
	JamMulai   string `json:"jamMulai"`
	JamSelesai string `json:"jamSelesai"`
	Status     string `json:"status"` // status asli event (terjadwal, selesai_normal, dst)
}