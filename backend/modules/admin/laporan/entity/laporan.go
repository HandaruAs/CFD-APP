package entity

// ============================================================
// LAPORAN SUPERADMIN -- GET /api/admin/laporan?startDate=&endDate=
// Menampilkan data semua role KECUALI superadmin: pedagang & petugas.
// ============================================================

type Periode struct {
	Mulai   string `json:"mulai"`   // 2006-01-02
	Selesai string `json:"selesai"` // 2006-01-02
}

type RingkasanAkun struct {
	Total         int `json:"total"`
	Aktif         int `json:"aktif"`         // users.status = 'active'
	Nonaktif      int `json:"nonaktif"`      // suspended / banned
	DaftarPeriode int `json:"daftarPeriode"` // akun dibuat di periode ini
}

type RingkasanPedagang struct {
	RingkasanAkun
	Baru     int `json:"baru"`     // daftar sendiri
	Lama     int `json:"lama"`     // ditambahkan admin
	BelumIsi int `json:"belumIsi"` // punya akun tapi belum isi data usaha
}

type RingkasanPetugas struct {
	RingkasanAkun
	Online int `json:"online"`
}

type RingkasanKehadiran struct {
	Total          int   `json:"total"`
	Checkout       int   `json:"checkout"`
	BelumCheckout  int   `json:"belumCheckout"`
	PedagangUnik   int   `json:"pedagangUnik"`
	JumlahSesi     int   `json:"jumlahSesi"`
	TotalOmset     int64 `json:"totalOmset"`
	RataOmset      int64 `json:"rataOmset"`
	OmsetTertinggi int64 `json:"omsetTertinggi"`
}

type RingkasanKlaim struct {
	Total        int `json:"total"`
	Aktif        int `json:"aktif"`
	Batal        int `json:"batal"`
	TanpaCheckin int `json:"tanpaCheckin"` // klaim yang pedagangnya tidak hadir
}

type Ringkasan struct {
	Pedagang  RingkasanPedagang  `json:"pedagang"`
	Petugas   RingkasanPetugas   `json:"petugas"`
	Kehadiran RingkasanKehadiran `json:"kehadiran"`
	Klaim     RingkasanKlaim     `json:"klaim"`
}

// PedagangRow -- 1 akun pedagang + rekap aktivitasnya di periode.
type PedagangRow struct {
	UserID         string `json:"userId"`
	NamaUsaha      string `json:"namaUsaha"`
	Pemilik        string `json:"pemilik"`
	Email          string `json:"email"`
	Phone          string `json:"phone"`
	Kategori       string `json:"kategori"`
	JenisLapak     string `json:"jenisLapak"`
	StatusAkun     string `json:"statusAkun"` // active | suspended | banned
	Jenis          string `json:"jenis"`      // baru | lama | belum_isi
	Terdaftar      string `json:"terdaftar"`  // tanggal akun dibuat
	JumlahKlaim    int    `json:"jumlahKlaim"`
	JumlahHadir    int    `json:"jumlahHadir"`
	JumlahCheckout int    `json:"jumlahCheckout"`
	TotalOmset     int64  `json:"totalOmset"`
	TerakhirHadir  string `json:"terakhirHadir"`
}

// PetugasRow -- 1 akun petugas + rekap scan QR-nya di periode.
type PetugasRow struct {
	UserID       string `json:"userId"`
	Nama         string `json:"nama"`
	Email        string `json:"email"`
	Phone        string `json:"phone"`
	StatusAkun   string `json:"statusAkun"`
	Online       bool   `json:"online"`
	Terdaftar    string `json:"terdaftar"`
	JumlahScan   int    `json:"jumlahScan"`
	PedagangUnik int    `json:"pedagangUnik"`
	JumlahSesi   int    `json:"jumlahSesi"`
	ScanTerakhir string `json:"scanTerakhir"` // 2006-01-02 15:04 WIB
}

// KehadiranRow -- 1 baris kehadiran pedagang di periode.
type KehadiranRow struct {
	ID          string `json:"id"`
	Tanggal     string `json:"tanggal"`
	NamaUsaha   string `json:"namaUsaha"`
	Pemilik     string `json:"pemilik"`
	Kategori    string `json:"kategori"`
	NamaJalan   string `json:"namaJalan"`
	NomorLapak  string `json:"nomorLapak"`
	CheckIn     string `json:"checkIn"`
	CheckOut    string `json:"checkOut"`
	Omset       *int64 `json:"omset"`
	DicatatOleh string `json:"dicatatOleh"`
}

type LaporanResponse struct {
	Periode   Periode        `json:"periode"`
	Ringkasan Ringkasan      `json:"ringkasan"`
	Pedagang  []PedagangRow  `json:"pedagang"`
	Petugas   []PetugasRow   `json:"petugas"`
	Kehadiran []KehadiranRow `json:"kehadiran"`
	// true kalau baris kehadiran dipotong di BatasKehadiran
	KehadiranTerpotong bool `json:"kehadiranTerpotong"`
}