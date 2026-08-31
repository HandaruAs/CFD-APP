package entity

import "time"

type Sesi struct {
	ID                string     `db:"id"`
	NamaSesi          string     `db:"nama_sesi"`          // baru dari migrasi 26
	Tanggal           string     `db:"tanggal"`
	JamMulai          string     `db:"jam_mulai"`
	JamSelesaiRencana string     `db:"jam_selesai"`        // di migrasi 26 kolom ini bernama jam_selesai
	JamSelesaiAktual  *string    `db:"jam_selesai_aktual"`
	Status            string     `db:"status"`             // VARCHAR, bukan ENUM lagi
	CreatedBy         *string    `db:"created_by"`
	IsActive          bool       `db:"is_active"`          // baru
	CreatedAt         time.Time  `db:"created_at"`
	UpdatedAt         time.Time  `db:"updated_at"`
}

type PengaturanPendaftaran struct {
	ID              string    `db:"id"`
	IsOpen          bool      `db:"is_open"`
	LinkPendaftaran *string   `db:"link_pendaftaran"`
	JamBuka         *string   `db:"jam_buka_pendaftaran"`
	JamTutup        *string   `db:"jam_tutup_pendaftaran"`
	UpdatedBy       *string   `db:"updated_by"`
	UpdatedAt       time.Time `db:"updated_at"`
}