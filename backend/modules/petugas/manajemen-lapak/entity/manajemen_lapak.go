package entity

import "time"

// ============================================================
// 1. WILAYAH LENGKAP (kecamatan -> jalan -> ruas) -- checklist #1
// ============================================================

// RuasData -- IsActive SENGAJA gak ada di sini: status aktif/nonaktif
// ruas dulu bisa diset manual per-ruas, tapi itu tumpang tindih sama
// status event (event yang ngatur aktif/nonaktif-nya, bukan ruas
// masing-masing), jadi dihapus daripada 2 sumber kebenaran yang
// tumpang tindih.
type RuasData struct {
	ID           string `json:"id"`
	NamaRuas     string `json:"namaRuas"`
	Urutan       int    `json:"urutan"`
	NomorMulai   int    `json:"nomorMulai"`   // read-only -- dihitung otomatis dari urutan+kuota semua ruas di jalan itu
	NomorSelesai int    `json:"nomorSelesai"` // read-only -- dihitung otomatis
	Kuota        int    `json:"kuota"`
	// TerisiLama/TerisiBaru -- read-only, DIHITUNG di GetWilayahLengkap
	// (bukan disimpan di JSONB ini), dari lapak_klaim (status aktif) yang
	// nomor_lapak-nya jatuh di rentang NomorMulai..NomorSelesai ruas ini,
	// pada event yang lagi aktif. Dipecah lewat pedagang_profiles.submitted_at:
	// NULL = pedagang "lama" (diklaimkan petugas), NOT NULL = pedagang
	// "baru" (klaim sendiri lewat war token). Kalau gak ada event aktif,
	// keduanya 0.
	TerisiLama int `json:"terisiLama"`
	TerisiBaru int `json:"terisiBaru"`
}

type JalanLengkapData struct {
	ID         string     `json:"id"`
	KodeJalan  string     `json:"kodeJalan"`
	NamaJalan  string     `json:"namaJalan"`
	Kapasitas  int        `json:"kapasitas"` // kuota dasar jalan (master_jalan.kapasitas)
	KuotaEvent int        `json:"kuotaEvent"` // kuota yang dialokasikan buat event yang lagi aktif (0 kalau jalan ini gak ikut event aktif)
	Terisi     int        `json:"terisi"`
	Ruas       []RuasData `json:"ruas"`
}

type KecamatanLengkapData struct {
	KecamatanID *string            `json:"kecamatanId"`
	Kecamatan   string             `json:"kecamatan"`
	Jalan       []JalanLengkapData `json:"jalan"`
}

// CreateKecamatanRequest -- tabel "Kecamatan" di UI 4-tabel Ruas & Kuota.
// Nama kecamatan disimpan ke master_instansi.nama_instansi (yang udah
// dipakai buat ngelompokin jalan selama ini).
type CreateKecamatanRequest struct {
	NamaKecamatan string `json:"namaKecamatan" validate:"required"`
}

// CreateJalanBaruRequest -- tabel "Jalan" di UI 4-tabel Ruas & Kuota.
// Bikin baris baru di master_jalan + langsung dikaitkan ke 1
// kecamatan lewat jalan_instansi.
type CreateJalanBaruRequest struct {
	KecamatanID string `json:"kecamatanId" validate:"required"`
	KodeJalan   string `json:"kodeJalan" validate:"required"`
	NamaJalan   string `json:"namaJalan" validate:"required"`
	Kapasitas   int    `json:"kapasitas" validate:"required,gt=0"`
}

// UpdateJalanBaruRequest -- edit jalan yang SUDAH ada (kode/nama/
// kapasitas). Kecamatan sengaja gak ikut di sini -- pindah kecamatan
// bukan bagian dari permintaan ini, jalan tetap di kecamatan yang sama.
// Kapasitas boleh diperbesar/diperkecil kapan aja (event aktif atau
// tidak), tapi gak boleh diturunkan sampai di bawah kuota yang udah
// kepakai (baik total kuota ruas maupun kuota event yang lagi aktif).
type UpdateJalanBaruRequest struct {
	KodeJalan string `json:"kodeJalan" validate:"required"`
	NamaJalan string `json:"namaJalan" validate:"required"`
	Kapasitas int    `json:"kapasitas" validate:"required,gt=0"`
}

// AssignJalanEventRequest -- buat nambahin/nyesuain kuota 1 jalan ke
// event yang lagi aktif, KAPAN AJA (gak cuma pas bikin event). Ini
// solusi buat kasus jalan baru yang dibikin SETELAH event-nya aktif --
// tinggal assign dari sini, gak perlu bikin ulang/edit event dari awal.
type AssignJalanEventRequest struct {
	Kuota int `json:"kuota" validate:"required,gt=0"`
}

// ============================================================
// 2. EVENT (dulu "Sesi CFD") -- checklist #2, #5
// ============================================================

type JalanEventInput struct {
	JalanID string `json:"jalanId" validate:"required"`
	Kuota   int    `json:"kuota" validate:"required,gt=0"`
}

type CreateEventRequest struct {
	NamaEvent          string            `json:"namaEvent" validate:"required"`
	Tanggal            string            `json:"tanggal" validate:"required"`   // YYYY-MM-DD
	JamMulai           string            `json:"jamMulai" validate:"required"`  // HH:MM
	JamSelesai         string            `json:"jamSelesai" validate:"required"` // HH:MM
	PendaftaranMulai   string            `json:"pendaftaranMulai" validate:"required"`   // RFC3339
	PendaftaranSelesai string            `json:"pendaftaranSelesai" validate:"required"` // RFC3339
	KuotaTotal         int               `json:"kuotaTotal" validate:"required,gt=0"`
	Keterangan         string            `json:"keterangan"`
	Jalan              []JalanEventInput `json:"jalan" validate:"required,min=1,dive"`
}

type EventDTO struct {
	ID                 string     `json:"id"`
	NamaEvent          string     `json:"namaEvent"`
	Tanggal            string     `json:"tanggal"`
	JamMulai           string     `json:"jamMulai"`
	JamSelesai         string     `json:"jamSelesai"`
	PendaftaranMulai   *time.Time `json:"pendaftaranMulai"`
	PendaftaranSelesai *time.Time `json:"pendaftaranSelesai"`
	KuotaTotal         int        `json:"kuotaTotal"`
	Keterangan         string     `json:"keterangan"`
	Status             string     `json:"status"`
	IsActive           bool       `json:"isActive"`
	Jalan              []JalanRingkasKuota `json:"jalan"`
}

type JalanRingkasKuota struct {
	JalanID   string `json:"jalanId"`
	NamaJalan string `json:"namaJalan"`
	Kuota     int    `json:"kuota"`
	Terisi    int    `json:"terisi"`
}

// KuotaEventDTO -- checklist #5 (kuota event ketika event dibuka)
type KuotaEventDTO struct {
	EventID    string `json:"eventId"`
	KuotaTotal int    `json:"kuotaTotal"`
	Terisi     int    `json:"terisi"`
	Sisa       int    `json:"sisa"`
}

// ============================================================
// 3. RUAS JALAN -- checklist #3, #7, #8
// ============================================================

// CreateRuasRequest -- Urutan gak lagi diinput manual (dianggap info
// yang sama aja buat petugas, karena hasil akhirnya cuma keliatan dari
// Status Lama/Baru): ditentukan otomatis di usecase (urutan
// terakhir + 1), petugas cuma isi nama & kuota.
type CreateRuasRequest struct {
	JalanID  string `json:"jalanId" validate:"required"`
	NamaRuas string `json:"namaRuas" validate:"required"`
	Kuota    int    `json:"kuota" validate:"required,gt=0"`
}

// UpdateRuasRequest -- Urutan ruas yang SUDAH ada gak ikut diedit lewat
// sini (tetap dari nilai lama), sama alasannya kayak CreateRuasRequest.
type UpdateRuasRequest struct {
	NamaRuas string `json:"namaRuas" validate:"required"`
	Kuota    int    `json:"kuota" validate:"required,gt=0"`
}

// ============================================================
// 4. PEDAGANG (dulu "Pedagang Lama", digabung sama Registrasi)
// ============================================================

type PedagangLamaItem struct {
	PedagangID     string `json:"pedagangId"`
	NIK            string `json:"nik"`
	NamaLengkap    string `json:"namaLengkap"`
	Email          string `json:"email"`
	NamaUsaha      string `json:"namaUsaha"`
	Kategori       string `json:"kategori"`
	Kontak         string `json:"kontak"`
	Lokasi         string `json:"lokasi"` // "Jl. Progo / 1"
	Status         string `json:"status"` // aktif | nonaktif, ikut status pedagang_profiles
	StatusPedagang string `json:"statusPedagang"` // "lama" | "baru" -- dari pedagang_profiles.submitted_at
}

type PedagangLamaResponse struct {
	Data  []PedagangLamaItem `json:"data"`
	Total int                `json:"total"`
	Page  int                `json:"page"`
	Limit int                `json:"limit"`
}

// PedagangLamaFilter -- checklist #4, filter tambahan biar sesuai
// referensi (Pencarian + Ruas + Status).
type PedagangLamaFilter struct {
	Search       string
	JalanID      string // kosong = semua jalan
	NomorMulai   *int   // dari ruas yang dipilih, dua-duanya nil kalau ruas gak dipilih
	NomorSelesai *int
	Status       string // "lama" | "baru" (submitted_at NULL/NOT NULL), kosong = semua
	Page         int
	Limit        int
}

// ============================================================
// 5. TAMBAH PEDAGANG (manual & import file) -- disamain field-nya
// kayak form pendaftaran pedagang beneran (email dkk), keduanya bikin
// pedagang berstatus "lama" (submitted_at sengaja dibiarkan NULL,
// beda dari pedagang yang daftar sendiri lewat sistem yang otomatis
// keisi submitted_at pas dia submit pengajuan).
// ============================================================

type CreatePedagangRequest struct {
	NamaLengkap    string `json:"namaLengkap" validate:"required"`
	NIK            string `json:"nik" validate:"required,max=16"`
	Email          string `json:"email" validate:"required"`
	NamaUsaha      string `json:"namaUsaha" validate:"required"`
	JenisDagangan  string `json:"jenisDagangan"` // makanan_minuman | bukan_makanan_minuman, boleh kosong
	Phone          string `json:"phone" validate:"omitempty,max=13"`
	Alamat         string `json:"alamat"`
	LokasiLapak    string `json:"lokasiLapak"`
	PerkiraanHarga string `json:"perkiraanHarga"`
	TanggalLahir   string `json:"tanggalLahir"` // YYYY-MM-DD, boleh kosong
	JenisLapak     string `json:"jenisLapak"`    // rombong | meja, boleh kosong
}

// CreatePedagangResult -- ngembaliin password yang di-generate sistem
// (bukan petugas yang ngarang), supaya bisa dikasih ke pedagangnya.
type CreatePedagangResult struct {
	PedagangID string `json:"pedagangId"`
	Email      string `json:"email"`
	Password   string `json:"password"`
}

type ImportPedagangResult struct {
	Berhasil int      `json:"berhasil"`
	Gagal    int      `json:"gagal"`
	Errors   []string `json:"errors"`
}