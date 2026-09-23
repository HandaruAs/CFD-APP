package entity

// Scope buat GenerateSlot -- SENGAJA niru persis nilai string dari
// modules/operasional/entity.ScopeKota/ScopeKecamatan/ScopeJalan (bukan
// import package-nya, ngikutin pola modul ini yang emang udah biasa
// duplikat helper kecil per-modul -- lihat ErrKecamatanTidakDitemukan
// yang juga ada duplikatnya di modules/pedagang/lapak).
const (
	ScopeKota      = "kota"      // se-Surabaya, semua jalan
	ScopeKecamatan = "kecamatan" // 1 kecamatan, semua jalan di dalamnya
	ScopeJalan     = "jalan"     // 1 jalan spesifik saja
	ScopeRuas      = "ruas"      // 1 ruas spesifik di 1 jalan
)

// WilayahPetugasSlot: wilayah tanggung jawab petugas yang lagi login,
// dipakai buat batasi scope yang boleh dia generate. KecamatanID & JalanID
// dua-duanya nil artinya petugas bebas (boleh generate di wilayah manapun)
// -- padanan modules/operasional/entity.WilayahPetugasDTO.
type WilayahPetugasSlot struct {
	KecamatanID *string
	JalanID     *string
	Bebas       bool
}

// GenerateSlotRequest: body buat POST /petugas/acak-lapak/generate-slot.
type GenerateSlotRequest struct {
	Scope       string  `json:"scope" binding:"required"` // kota | kecamatan | jalan | ruas
	KecamatanID *string `json:"kecamatanId"`
	JalanID     *string `json:"jalanId"` // wajib untuk scope jalan & ruas
	RuasID      *string `json:"ruasId"`  // wajib untuk scope ruas
	// GantiPoolLama: true = lokasi lama yang BELUM diklaim dihapus dulu,
	// jadi yang bisa diklaim pedagang cuma hasil acak ini. false = hasil
	// acak ini DITAMBAHKAN ke pool yang sudah ada. Slot yang sudah diklaim
	// pedagang tidak pernah dihapus.
	GantiPoolLama bool `json:"gantiPoolLama"`
}

// GenerateSlotResponse: ringkasan hasil generate, ditampilkan ke petugas
// abis klik "Acak Lapak".
type GenerateSlotResponse struct {
	Scope             string `json:"scope"`
	ScopeLabel        string `json:"scopeLabel"` // "Se-Surabaya" / "Kec. Sukolilo" / "Jl. Kertajaya" / "Ruas Pujasera, Jl. Dharmawangsa"
	JumlahJalan       int    `json:"jumlahJalan"`
	JumlahRuas        int    `json:"jumlahRuas"` // jumlah ruas yang ikut disiapkan (0 kalau jalan-jalannya belum dibagi ruas)
	JumlahSlotDibuat  int    `json:"jumlahSlotDibuat"`
	JumlahSlotDihapus int    `json:"jumlahSlotDihapus"` // slot lama belum diklaim yang dibuang (kalau GantiPoolLama)
	JumlahSlotAda     int    `json:"jumlahSlotAda"`     // total slot (lama + baru) yang sekarang ada buat scope ini
}

// RuasOpsi: 1 pilihan ruas buat dropdown di halaman Acak Lapak.
type RuasOpsi struct {
	ID       string `json:"id"`
	NamaRuas string `json:"namaRuas"`
	Kuota    int    `json:"kuota"`
}