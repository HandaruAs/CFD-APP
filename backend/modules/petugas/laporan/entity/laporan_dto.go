package entity

// ============================================================
// LAPORAN KE HADIRAN - REQUEST & RESPONSE
// ============================================================

// LaporanRequest - request filter laporan
type LaporanRequest struct {
	StartDate string `json:"startDate" query:"startDate"` // format: 2006-01-02
	EndDate   string `json:"endDate" query:"endDate"`     // format: 2006-01-02
	Search    string `json:"search" query:"search"`
	Page      int    `json:"page" query:"page"`
	Limit     int    `json:"limit" query:"limit"`
}

// KehadiranItem - 1 baris data kehadiran
type KehadiranItem struct {
	ID            string  `json:"id"`
	PedagangID    string  `json:"pedagangId"`
	NamaUsaha     string  `json:"namaUsaha"`
	Pemilik       string  `json:"pemilik"`
	Inisial       string  `json:"inisial"`
	Kategori      string  `json:"kategori"`
	LokasiLapak   string  `json:"lokasiLapak"`
	WaktuCheckin  string  `json:"waktuCheckin"`  // format: "06:15"
	WaktuCheckout *string `json:"waktuCheckout"` // format: "10:30", nil jika belum checkout
	Omset         *int64  `json:"omset"`         // diisi pedagang
	Metode        string  `json:"metode"`        // "Scan QR"
	Status        string  `json:"status"`        // "check-in" | "check-out" | "belum-hadir"
}

// LaporanResponse - response laporan kehadiran
type LaporanResponse struct {
	TotalTerdaftar int             `json:"totalTerdaftar"`
	TotalCheckin   int             `json:"totalCheckin"`
	TotalCheckout  int             `json:"totalCheckout"`
	TotalOmset     int64           `json:"totalOmset"`
	RataOmset      int64           `json:"rataOmset"`
	PersenHadir    float64         `json:"persenHadir"`
	Data           []KehadiranItem `json:"data"`
	Page           int             `json:"page"`
	Limit          int             `json:"limit"`
	Total          int             `json:"total"`
}

// StatsResponse - statistik kehadiran
type StatsResponse struct {
	TotalTerdaftar int     `json:"totalTerdaftar"`
	TotalCheckin   int     `json:"totalCheckin"`
	TotalCheckout  int     `json:"totalCheckout"`
	TotalOmset     int64   `json:"totalOmset"`
	RataOmset      int64   `json:"rataOmset"`
	PersenHadir    float64 `json:"persenHadir"`
}