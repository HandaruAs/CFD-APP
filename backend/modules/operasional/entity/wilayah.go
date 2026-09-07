package entity

// ScopeSesi menandai cakupan sebuah sesi CFD.
const (
	ScopeKota      = "kota"      // se-Surabaya, semua jalan
	ScopeKecamatan = "kecamatan" // 1 kecamatan, semua jalan di dalamnya
	ScopeJalan     = "jalan"     // 1 jalan spesifik saja
)

// WilayahPetugasDTO: wilayah tanggung jawab petugas yang sedang login.
// KecamatanID & JalanID dua-duanya nil artinya petugas bebas (boleh atur
// sesi di wilayah manapun).
type WilayahPetugasDTO struct {
	KecamatanID   *string `json:"kecamatanId"`
	KecamatanNama *string `json:"kecamatanNama"`
	JalanID       *string `json:"jalanId"`
	JalanNama     *string `json:"jalanNama"`
	Bebas         bool    `json:"bebas"` // true kalau kecamatan & jalan dua-duanya kosong
}

// JalanRingkas dipakai untuk menampilkan daftar jalan yang ikut dalam 1 sesi.
type JalanRingkas struct {
	ID            string `json:"id"`
	Nama          string `json:"nama"`
	KecamatanID   string `json:"kecamatanId"`
	KecamatanNama string `json:"kecamatanNama"`
}

// SesiWilayahDTO: 1 sesi CFD dengan info cakupan wilayahnya.
type SesiWilayahDTO struct {
	ID                string         `json:"id"`
	NamaSesi          string         `json:"namaSesi"`
	Tanggal           string         `json:"tanggal"`
	JamMulai          string         `json:"jamMulai"`
	JamSelesaiRencana string         `json:"jamSelesaiRencana"`
	Status            string         `json:"status"`
	Aktif             bool           `json:"aktif"`
	SisaMenit         int            `json:"sisaMenit"`
	TotalMenit        int            `json:"totalMenit"`
	Scope             string         `json:"scope"`      // kota | kecamatan | jalan
	ScopeLabel        string         `json:"scopeLabel"` // label siap tampil, mis. "Se-Surabaya" / "Kec. Sukolilo" / "Jl. Kertajaya"
	Jalan             []JalanRingkas `json:"jalan"`
}

// CreateSesiWilayahRequest: body buat bikin sesi CFD baru untuk 1 wilayah.
type CreateSesiWilayahRequest struct {
	Scope             string  `json:"scope" binding:"required"` // kota | kecamatan | jalan
	KecamatanID       *string `json:"kecamatanId"`
	JalanID           *string `json:"jalanId"`
	Tanggal           string  `json:"tanggal" binding:"required"`           // format YYYY-MM-DD
	JamMulai          string  `json:"jamMulai" binding:"required"`          // HH:MM
	JamSelesaiRencana string  `json:"jamSelesaiRencana" binding:"required"` // HH:MM
}

// sesiJalanRow: 1 baris hasil query join cfd_sessions + jalan_kapasitas_sesi
// + master_jalan + jalan_instansi + master_instansi. Dipakai internal di
// repository buat dikumpulin (group by session id) jadi SesiWilayahDTO.
type SesiJalanRow struct {
	SesiID            string
	NamaSesi          string
	Tanggal           string
	JamMulai          string
	JamSelesaiRencana string
	JamSelesaiAktual  *string
	Status            string
	IsActive          bool
	JalanID           string
	JalanNama         string
	KecamatanID       *string
	KecamatanNama     *string
}