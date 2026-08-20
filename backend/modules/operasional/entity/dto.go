package entity

// --- REQUEST DTO (input dari frontend / JSON body) ---

// UpdateSesiRequest dipakai buat tombol "Simpan Perubahan" di halaman
// Jam Operasional. Kalau sesi hari ini belum ada (petugas belum pernah
// atur jam buat hari ini), endpoint akan BIKIN baris baru (upsert) --
// jadi petugas nggak perlu tombol "mulai sesi" terpisah.
type UpdateSesiRequest struct {
	JamMulai          string `json:"jamMulai" binding:"required"`          // format "HH:MM"
	JamSelesaiRencana string `json:"jamSelesaiRencana" binding:"required"` // format "HH:MM"
}

// UpdatePendaftaranRequest dipakai buat tombol "Buka Pendaftaran" /
// "Tutup Pendaftaran".
type UpdatePendaftaranRequest struct {
	IsOpen bool `json:"isOpen"`
}

// PerpanjangSesiRequest dipakai buat tombol "Perpanjang Sesi" -- beda
// dari UpdateSesiRequest ("Simpan Perubahan") karena perpanjang CUMA
// boleh majuin jam_selesai_rencana (ke jam yang lebih lambat) dan
// otomatis ganti status sesi jadi 'diperpanjang', nggak bisa dipakai
// buat ubah jam_mulai.
type PerpanjangSesiRequest struct {
	JamSelesaiBaru string `json:"jamSelesaiBaru" binding:"required"` // format "HH:MM"
}

// --- RESPONSE DTO (bentuk JSON yang dikirim ke frontend) ---

// StatusOperasionalResponse adalah response gabungan buat
// GET /api/petugas/jam-operasional -- satu request, langsung dapet
// semua yang dibutuhin halaman: status pendaftaran, sesi hari ini
// (kalau ada), dan riwayat sesi-sesi sebelumnya.
type StatusOperasionalResponse struct {
	Pendaftaran PendaftaranStatusDTO `json:"pendaftaran"`
	Sesi        *SesiAktifDTO        `json:"sesi"` // nil kalau belum ada sesi buat hari ini
	Riwayat     []RiwayatSesiDTO     `json:"riwayat"`
}

type PendaftaranStatusDTO struct {
	IsOpen          bool    `json:"isOpen"`
	LinkPendaftaran *string `json:"linkPendaftaran"`
}

// SesiAktifDTO -- dipakai buat kartu "Status Sesi CFD" + ring "Sisa Waktu".
// SisaMenit & TotalMenit dihitung di usecase (bukan cuma nge-passthrough
// dari database), jadi frontend nggak perlu ngitung ulang.
type SesiAktifDTO struct {
	ID                string `json:"id"`
	Tanggal           string `json:"tanggal"`
	JamMulai          string `json:"jamMulai"`
	JamSelesaiRencana string `json:"jamSelesaiRencana"`
	Status            string `json:"status"`
	SisaMenit         int    `json:"sisaMenit"`
	TotalMenit        int    `json:"totalMenit"`
}

// RiwayatSesiDTO -- 1 baris di tabel "Riwayat Operasional". Field & value
// status-nya sengaja disamain persis sama type StatusRiwayat di
// petugas/jam-operasional/page.tsx ("normal" | "diperpanjang" |
// "diakhiri-awal") biar frontend nggak perlu mapping apa-apa lagi.
type RiwayatSesiDTO struct {
	Tanggal    string `json:"tanggal"`
	JamMulai   string `json:"jamMulai"`
	JamSelesai string `json:"jamSelesai"`
	Durasi     string `json:"durasi"`
	Status     string `json:"status"`
}
