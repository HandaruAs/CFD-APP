package entity

// ============================================================
// DASHBOARD SUPERADMIN -- GET /api/admin/dashboard
// Semua angka dikirim dalam 1 response supaya halaman cukup 1x fetch.
// ============================================================

// DashboardResponse: response utama dashboard superadmin.
type DashboardResponse struct {
	HariIni HariIniDTO `json:"hariIni"`
	Tren    TrenDTO    `json:"tren"`
}

// ------------------------------------------------------------
// 1. KONDISI HARI INI
// ------------------------------------------------------------

type HariIniDTO struct {
	Tanggal string       `json:"tanggal"` // YYYY-MM-DD
	Sesi    SesiHariIni  `json:"sesi"`
	Lapak   LapakHariIni `json:"lapak"`
	Hadir   HadirHariIni `json:"hadir"`
	// Events: SEMUA event hari ini (satu hari boleh banyak event).
	// Sesi/Lapak/Hadir di atas = ringkasan untuk tampilan lama (mobile).
	Events []EventHariIni `json:"events"`
}

// EventHariIni: 1 event di tanggal hari ini.
type EventHariIni struct {
	ID         string `json:"id"`
	Nama       string `json:"nama"`
	Status     string `json:"status"` // terjadwal | berjalan | selesai | dibatalkan (sama dengan SesiHariIni)
	JamMulai   string `json:"jamMulai"`
	JamSelesai string `json:"jamSelesai"`
	SisaMenit  int    `json:"sisaMenit"`
	Titik      int    `json:"titik"`
	Kapasitas  int    `json:"kapasitas"`
	Klaim      int    `json:"klaim"`
	CheckIn    int    `json:"checkIn"`
	CheckOut   int    `json:"checkOut"`
	Omset      int64  `json:"omset"`
}

// SesiHariIni: ringkasan event hari ini yang paling relevan -- yang sedang
// berjalan, lalu yang akan mulai paling dekat, lalu yang terakhir selesai.
// Status: "belum_ada" | "terjadwal" | "berjalan" | "selesai" | "dibatalkan"
type SesiHariIni struct {
	Status     string  `json:"status"`
	NamaSesi   *string `json:"namaSesi"`
	JamMulai   *string `json:"jamMulai"`   // HH:MM
	JamSelesai *string `json:"jamSelesai"` // HH:MM (rencana, atau aktual kalau diakhiri lebih awal)
	SisaMenit  int     `json:"sisaMenit"`  // cuma terisi kalau status "berjalan"
}

// LapakHariIni: kapasitas = total kuota titik lokasi semua event hari ini,
// terisi = pedagang yang dapat lapak (tidak batal) di event-event itu.
type LapakHariIni struct {
	Terisi    int     `json:"terisi"`
	Kapasitas int     `json:"kapasitas"`
	Persen    float64 `json:"persen"`
}

// HadirHariIni: pedagang yang sudah check-in dibanding yang dapat lapak,
// dijumlah untuk semua event hari ini.
type HadirHariIni struct {
	Klaim    int `json:"klaim"`
	CheckIn  int `json:"checkIn"`
	CheckOut int `json:"checkOut"`
}

// ------------------------------------------------------------
// 2. TREN
// ------------------------------------------------------------

type TrenDTO struct {
	Sesi   []TrenSesi   `json:"sesi"`   // urut dari sesi terlama ke terbaru
	Minggu []TrenMinggu `json:"minggu"` // 8 minggu terakhir, urut terlama ke terbaru
}

// TrenSesi: 1 titik di grafik kehadiran & omset = 1 event.
type TrenSesi struct {
	SesiID   string `json:"sesiId"`
	Tanggal  string `json:"tanggal"` // YYYY-MM-DD
	NamaSesi string `json:"namaSesi"`
	Klaim    int    `json:"klaim"`
	Hadir    int    `json:"hadir"`
	Omset    int64  `json:"omset"`
}

// TrenMinggu: pedagang yang terdaftar per minggu.
type TrenMinggu struct {
	MingguMulai string `json:"mingguMulai"` // YYYY-MM-DD (hari Senin)
	Baru        int    `json:"baru"`        // daftar sendiri
	Lama        int    `json:"lama"`        // ditambahkan admin / import
	Total       int    `json:"total"`       // total pedagang aktif s/d akhir minggu itu
}