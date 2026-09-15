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
	Scope       string  `json:"scope" binding:"required"` // kota | kecamatan | jalan
	KecamatanID *string `json:"kecamatanId"`
	JalanID     *string `json:"jalanId"`
}

// GenerateSlotResponse: ringkasan hasil generate, ditampilkan ke petugas
// abis klik "Acak Lapak".
type GenerateSlotResponse struct {
	Scope            string `json:"scope"`
	ScopeLabel       string `json:"scopeLabel"` // "Se-Surabaya" / "Kec. Sukolilo" / "Jl. Kertajaya"
	JumlahJalan      int    `json:"jumlahJalan"`
	JumlahSlotDibuat int    `json:"jumlahSlotDibuat"`
	JumlahSlotAda    int    `json:"jumlahSlotAda"` // total slot (lama + baru) yang sekarang ada buat scope ini
}