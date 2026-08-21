package entity

import (
	"time"
)

// Hari merepresentasikan enum hari_enum di database.
type Hari string

const (
	HariSenin  Hari = "senin"
	HariSelasa Hari = "selasa"
	HariRabu   Hari = "rabu"
	HariKamis  Hari = "kamis"
	HariJumat  Hari = "jumat"
	HariSabtu  Hari = "sabtu"
	HariMinggu Hari = "minggu"
)

// JadwalMingguan merepresentasikan 1 baris di tabel jadwal_mingguan --
// template jadwal CFD yang berulang tiap minggu (misal "tiap Minggu
// 06:00-11:00"), dipakai background job buat auto mulai/selesaiin sesi.
type JadwalMingguan struct {
	ID                string    `db:"id"`
	Hari              Hari      `db:"hari"`
	JamMulai          string    `db:"jam_mulai"`
	JamSelesaiRencana string    `db:"jam_selesai_rencana"`
	IsActive          bool      `db:"is_active"`
	UpdatedBy         *string   `db:"updated_by"`
	CreatedAt         time.Time `db:"created_at"`
	UpdatedAt         time.Time `db:"updated_at"`
}

// HariDariWeekday ubah time.Weekday bawaan Go (Sunday=0 ... Saturday=6)
// jadi nilai Hari yang cocok sama enum di database.
func HariDariWeekday(w time.Weekday) Hari {
	switch w {
	case time.Monday:
		return HariSenin
	case time.Tuesday:
		return HariSelasa
	case time.Wednesday:
		return HariRabu
	case time.Thursday:
		return HariKamis
	case time.Friday:
		return HariJumat
	case time.Saturday:
		return HariSabtu
	default: // time.Sunday
		return HariMinggu
	}
}
