package entity

import "time"

// PeriksaRequest: body POST /api/petugas/event-checkin/periksa.
// qrCode berisi id keikutsertaan (QR di kartu event pedagang). Selama
// aplikasi mobile belum disesuaikan, id pedagang (QR lama) juga diterima.
type PeriksaRequest struct {
	QRCode string `json:"qrCode"`
}

// CheckInRequest: body POST /api/petugas/event-checkin.
type CheckInRequest struct {
	PesertaID string  `json:"pesertaId"`
	Catatan   *string `json:"catatan"`
}

// PesertaScan: hasil pindai QR -- siapa pedagangnya, event apa, lapak mana,
// dan apakah boleh check-in sekarang.
type PesertaScan struct {
	PesertaID     string     `json:"pesertaId"`
	PedagangID    string     `json:"pedagangId"`
	NamaLengkap   *string    `json:"namaLengkap"`
	NamaUsaha     *string    `json:"namaUsaha"`
	JenisDagangan *string    `json:"jenisDagangan"`
	JenisLapak    *string    `json:"jenisLapak"`
	Kategori      string     `json:"kategori"` // lama | baru
	EventID       string     `json:"eventId"`
	NamaEvent     string     `json:"namaEvent"`
	Tanggal       string     `json:"tanggal"`
	JamMulai      string     `json:"jamMulai"`
	JamSelesai    string     `json:"jamSelesai"`
	StatusEvent   string     `json:"statusEvent"`
	NamaKecamatan *string    `json:"namaKecamatan"`
	NamaJalan     string     `json:"namaJalan"`
	NamaRuas      string     `json:"namaRuas"`
	Nomor         int        `json:"nomor"`
	Status        string     `json:"status"` // status keikutsertaan
	CheckInAt     *time.Time `json:"checkInAt"`
	BisaCheckIn   bool       `json:"bisaCheckIn"`
	Alasan        *string    `json:"alasan"` // kenapa tidak bisa check-in

	MulaiAt   time.Time `json:"-"`
	SelesaiAt time.Time `json:"-"`
}

// RiwayatItem: satu baris riwayat check-in petugas hari ini.
type RiwayatItem struct {
	PesertaID   string    `json:"pesertaId"`
	NamaLengkap *string   `json:"namaLengkap"`
	NamaUsaha   *string   `json:"namaUsaha"`
	NamaEvent   string    `json:"namaEvent"`
	NamaJalan   string    `json:"namaJalan"`
	NamaRuas    string    `json:"namaRuas"`
	Nomor       int       `json:"nomor"`
	CheckInAt   time.Time `json:"checkInAt"`
}