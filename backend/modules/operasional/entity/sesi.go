package entity

import "time"

// SesiStatus merepresentasikan enum cfd_session_status di database.
// Pakai type khusus (bukan string biasa) biar kalau nanti ketik salah
// ("berlansung" misalnya), itu ketauan pas compile, bukan pas runtime.
type SesiStatus string

const (
	SesiBerlangsung   SesiStatus = "berlangsung"
	SesiSelesaiNormal SesiStatus = "selesai_normal"
	SesiDiperpanjang  SesiStatus = "diperpanjang"
	SesiDiakhiriAwal  SesiStatus = "diakhiri_awal"
)

// Sesi merepresentasikan 1 baris di tabel cfd_sessions -- 1 hari CFD.
type Sesi struct {
	ID                string `db:"id"`
	Tanggal           string `db:"tanggal"`             // kolom DATE -> format "2006-01-02"
	JamMulai          string `db:"jam_mulai"`            // kolom TIME -> format "15:04:05"
	JamSelesaiRencana string `db:"jam_selesai_rencana"`
	// Pointer (*string) dipakai buat kolom yang boleh NULL di database --
	// sama kayak DeletedAt di entity User. Kalau sesi masih berlangsung,
	// jam_selesai_aktual belum keisi, jadi nilainya nil, bukan string kosong.
	JamSelesaiAktual *string    `db:"jam_selesai_aktual"`
	Status           SesiStatus `db:"status"`
	CreatedBy        *string    `db:"created_by"`
	CreatedAt        time.Time  `db:"created_at"`
	UpdatedAt        time.Time  `db:"updated_at"`
}

// PengaturanPendaftaran merepresentasikan satu-satunya baris di tabel
// pengaturan_pendaftaran (settings global, bukan per-tanggal kayak Sesi).
type PengaturanPendaftaran struct {
	ID              string    `db:"id"`
	IsOpen          bool      `db:"is_open"`
	LinkPendaftaran *string   `db:"link_pendaftaran"`
	UpdatedBy       *string   `db:"updated_by"`
	UpdatedAt       time.Time `db:"updated_at"`
}
