package entity

import "time"

// Cakupan acak lokasi per event.
const (
	ScopeKota      = "kota"      // se-Surabaya
	ScopeKecamatan = "kecamatan" // 1 atau lebih kecamatan
	ScopeJalan     = "jalan"     // 1 atau lebih jalan
	ScopeRuas      = "ruas"      // 1 atau lebih ruas yang dipilih admin
)

// Event: 1 baris di halaman Manajemen Event (Jam Operasional).
type Event struct {
	ID                 string     `json:"id"`
	Nama               string     `json:"nama"`
	Tanggal            string     `json:"tanggal"`    // YYYY-MM-DD
	JamMulai           string     `json:"jamMulai"`   // HH:MM
	JamSelesai         string     `json:"jamSelesai"` // HH:MM
	Status             string     `json:"status"`
	StatusPendaftaran  string     `json:"statusPendaftaran"` // belum_dibuka | dibuka | ditutup
	PendaftaranBukaAt  *time.Time `json:"pendaftaranBukaAt"`
	PendaftaranTutupAt *time.Time `json:"pendaftaranTutupAt"`
	LepasKuotaAt       *time.Time `json:"lepasKuotaAt"`
	KuotaLamaDilepas   bool       `json:"kuotaLamaDilepas"`
	JamMulaiAktual     *time.Time `json:"jamMulaiAktual"`
	JamSelesaiAktual   *time.Time `json:"jamSelesaiAktual"`
	Keterangan         *string    `json:"keterangan"`
	// Kuota PER EVENT: admin mengisi kuota total & kuota pedagang lama,
	// kuota pedagang baru = total - lama.
	KuotaTotal     int `json:"kuotaTotal"`
	KuotaLama      int `json:"kuotaLama"`
	KuotaBaru      int `json:"kuotaBaru"`
	TerisiLama     int `json:"terisiLama"`
	TerisiBaru     int `json:"terisiBaru"`
	SisaLama       int `json:"sisaLama"`
	SisaBaru       int `json:"sisaBaru"`
	JumlahTitik    int `json:"jumlahTitik"`
	KapasitasTitik int `json:"kapasitasTitik"` // = kuota sesi (lokasi muat sebanyak kuota)
	// Lokasi hasil undian, mis. "Jalan Mulyosari · Ruas A (Kec. Sukolilo)";
	// null kalau belum diacak.
	Lokasi    *string   `json:"lokasi"`
	CreatedAt time.Time `json:"createdAt"`

	MulaiAt time.Time `json:"-"` // tanggal + jam_mulai (WIB), buat hitung status pendaftaran
}

// EventLapak: 1 titik lokasi (ruas) di sebuah event. Kapasitas = berapa
// lapak yang muat secara fisik (dari kuota ruas di Manajemen Lapak); nomor
// stan di titik ini = 1..kapasitas.
type EventLapak struct {
	ID            string  `json:"id"`
	RuasID        string  `json:"ruasId"`
	NamaRuas      string  `json:"namaRuas"`
	JalanID       string  `json:"jalanId"`
	NamaJalan     string  `json:"namaJalan"`
	KecamatanID   *string `json:"kecamatanId"`
	NamaKecamatan *string `json:"namaKecamatan"`
	Kapasitas     int     `json:"kapasitas"`
	Terisi        int     `json:"terisi"`
	Sisa          int     `json:"sisa"`
	NomorTerbesar int     `json:"-"` // nomor terbesar yang sedang dipakai peserta aktif
}

type EventDetail struct {
	Event
	Lapak []EventLapak `json:"lapak"`
}

// EventRequest: body POST /api/admin/events dan PUT /api/admin/events/:id.
// Waktu pendaftaran boleh RFC3339 ("2026-10-03T18:00:00+07:00") atau format
// input datetime-local ("2026-10-03T18:00", dianggap WIB).
type EventRequest struct {
	Nama               string  `json:"nama"`
	Tanggal            string  `json:"tanggal"`
	JamMulai           string  `json:"jamMulai"`
	JamSelesai         string  `json:"jamSelesai"`
	PendaftaranBukaAt  *string `json:"pendaftaranBukaAt"`
	PendaftaranTutupAt *string `json:"pendaftaranTutupAt"`
	LepasKuotaAt       *string `json:"lepasKuotaAt"`
	Keterangan         *string `json:"keterangan"`
	KuotaTotal         int     `json:"kuotaTotal"` // kuota event, mis. 50
	KuotaLama          int     `json:"kuotaLama"`  // jatah pedagang lama dari kuota total, mis. 20
}

// EventInput: EventRequest yang sudah divalidasi & diparse usecase.
type EventInput struct {
	Nama               string
	Tanggal            string
	JamMulai           string
	JamSelesai         string
	PendaftaranBukaAt  *time.Time
	PendaftaranTutupAt *time.Time
	LepasKuotaAt       *time.Time
	Keterangan         *string
	KuotaTotal         int
	KuotaLama          int
}

// Aksi status event.
const (
	AksiTerbitkan  = "terbitkan"  // draft -> terjadwal (terlihat pedagang)
	AksiMulai      = "mulai"      // terjadwal -> berlangsung (buka manual di hari-H)
	AksiPerpanjang = "perpanjang" // berlangsung/diperpanjang -> diperpanjang (jamSelesai baru)
	AksiAkhiri     = "akhiri"     // berlangsung/diperpanjang -> diakhiri_awal
	AksiBatalkan   = "batalkan"   // draft/terjadwal -> dibatalkan
)

type UbahStatusRequest struct {
	Aksi       string  `json:"aksi"`
	JamSelesai *string `json:"jamSelesai"` // wajib untuk aksi perpanjang
	Alasan     *string `json:"alasan"`
}

// AcakLokasiRequest: body POST /api/admin/events/:id/acak-lokasi.
// Sistem memilih ruas secara acak di dalam cakupan, lalu menambahkannya ke
// event ini. Bisa ditekan berkali-kali untuk menambah titik.
//
// Cakupan boleh lebih dari satu wilayah: isi kecamatanIds / jalanIds /
// ruasIds sesuai scope. kecamatanId / jalanId (tunggal) tetap diterima
// supaya request lama tidak rusak.
type AcakLokasiRequest struct {
	Scope        string   `json:"scope"` // kota | kecamatan | jalan | ruas
	KecamatanIDs []string `json:"kecamatanIds"`
	JalanIDs     []string `json:"jalanIds"`
	RuasIDs      []string `json:"ruasIds"`
	KecamatanID  *string  `json:"kecamatanId"`
	JalanID      *string  `json:"jalanId"`

	// WilayahIDs: id kecamatan/jalan/ruas yang sudah dirapikan usecase
	// (gabungan field jamak + tunggal, tanpa duplikat). Kosong untuk scope kota.
	WilayahIDs []string `json:"-"`
}

type AcakLokasiResponse struct {
	ScopeLabel     string       `json:"scopeLabel"`
	JumlahKandidat int          `json:"jumlahKandidat"` // ruas yang tersedia di cakupan sebelum diacak
	Ditambahkan    []EventLapak `json:"ditambahkan"`
}

// UpdateKapasitasRequest: ubah kapasitas fisik 1 titik.
type UpdateKapasitasRequest struct {
	Kapasitas int `json:"kapasitas"`
}

type Peserta struct {
	ID           string     `json:"id"`
	PedagangID   string     `json:"pedagangId"`
	NamaLengkap  *string    `json:"namaLengkap"`
	NamaUsaha    *string    `json:"namaUsaha"`
	Kategori     string     `json:"kategori"`
	KuotaDipakai string     `json:"kuotaDipakai"`
	Status       string     `json:"status"`
	NamaJalan    string     `json:"namaJalan"`
	NamaRuas     string     `json:"namaRuas"`
	Nomor        int        `json:"nomor"`
	KodeStan     string     `json:"kodeStan"` // nomor stan untuk ditampilkan, mis. "CFD-012361"
	AcakAt       time.Time  `json:"acakAt"`
	CheckInAt    *time.Time `json:"checkInAt"`
	CheckOutAt   *time.Time `json:"checkOutAt"`
	AutoCheckout bool       `json:"autoCheckout"`
}