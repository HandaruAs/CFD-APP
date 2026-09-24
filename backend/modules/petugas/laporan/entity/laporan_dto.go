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

// ============================================================
// DETAIL KEHADIRAN (dibuka saat petugas klik 1 baris di tabel laporan)
// ============================================================

// DetailKehadiranRaw - hasil mentah dari database (NIK & email masih asli).
// Tidak pernah dikirim langsung ke client; usecase mengubahnya jadi
// DetailKehadiranResponse yang NIK & email-nya sudah disensor.
type DetailKehadiranRaw struct {
	KehadiranID    string
	Tanggal        string
	NamaSesi       string
	WaktuCheckin   string
	WaktuCheckout  *string
	Omset          *int64
	Status         string
	DicatatOleh    string
	NamaJalan      string
	Kecamatan      string
	NomorLapak     string
	LokasiLapak    string
	NamaUsaha      string
	JenisDagangan  string
	JenisLapak     string
	NamaLengkap    string
	NIK            string
	Email          string
	TanggalLahir   string
	StatusPedagang string // "lama" | "baru"
}

// DetailKehadiranResponse - response GET /api/petugas/laporan/:id
type DetailKehadiranResponse struct {
	Kehadiran struct {
		ID            string  `json:"id"`
		Tanggal       string  `json:"tanggal"` // format: 2006-01-02
		NamaSesi      string  `json:"namaSesi"`
		WaktuCheckin  string  `json:"waktuCheckin"`
		WaktuCheckout *string `json:"waktuCheckout"`
		Omset         *int64  `json:"omset"`
		Status        string  `json:"status"`
		DicatatOleh   string  `json:"dicatatOleh"`
	} `json:"kehadiran"`
	Lokasi struct {
		NamaJalan   string `json:"namaJalan"`
		Kecamatan   string `json:"kecamatan"`
		NomorLapak  string `json:"nomorLapak"`
		LokasiLapak string `json:"lokasiLapak"` // lokasi dari profil, dipakai kalau belum klaim lapak
	} `json:"lokasi"`
	Usaha struct {
		NamaUsaha     string `json:"namaUsaha"`
		JenisDagangan string `json:"jenisDagangan"`
		JenisLapak    string `json:"jenisLapak"`
	} `json:"usaha"`
	Pribadi struct {
		NamaLengkap    string `json:"namaLengkap"`
		NIK            string `json:"nik"`   // sudah disensor, contoh: 3578********0001
		Email          string `json:"email"` // sudah disensor, contoh: ha***@gmail.com
		TanggalLahir   string `json:"tanggalLahir"`
		StatusPedagang string `json:"statusPedagang"` // "lama" | "baru"
	} `json:"pribadi"`
}