// Package eventaturan berisi aturan bersama untuk fitur multi-event yang
// dipakai modul admin/event dan pedagang/event: status pendaftaran per
// event, pelepasan kuota lama, angka acak (crypto/rand), dan audit log.
// Ditaruh di satu tempat supaya admin dan pedagang selalu menilai
// "pendaftaran buka/tutup" dengan aturan yang sama persis.
package eventaturan

import (
	"context"
	"crypto/rand"
	"encoding/json"
	"errors"
	"math/big"
	"time"

	"github.com/jackc/pgx/v5/pgconn"
)

// Status event (enum event_status di DB).
const (
	StatusDraft         = "draft"
	StatusTerjadwal     = "terjadwal"
	StatusBerlangsung   = "berlangsung"
	StatusDiperpanjang  = "diperpanjang"
	StatusDiakhiriAwal  = "diakhiri_awal"
	StatusSelesaiNormal = "selesai_normal"
	StatusDibatalkan    = "dibatalkan"
)

// Status pendaftaran yang dihitung (tidak disimpan di DB).
const (
	PendaftaranBelumDibuka = "belum_dibuka"
	PendaftaranDibuka      = "dibuka"
	PendaftaranDitutup     = "ditutup"
)

// Kategori pedagang & status peserta (enum di DB).
const (
	KategoriLama = "lama"
	KategoriBaru = "baru"

	PesertaTerdaftar  = "terdaftar"
	PesertaCheckIn    = "check_in"
	PesertaCheckOut   = "check_out"
	PesertaBatal      = "batal"
	PesertaTidakHadir = "tidak_hadir"
)

// WIB dipakai untuk parsing input waktu tanpa zona. Sengaja FixedZone,
// bukan time.LoadLocation("Asia/Jakarta"), supaya tetap jalan di Windows
// yang tidak punya database zona waktu.
var WIB = time.FixedZone("WIB", 7*3600)

// StatusPendaftaran menilai apakah pendaftaran sebuah event sedang buka.
// Aturan:
//   - event draft -> belum_dibuka
//   - event selain terjadwal (berlangsung, selesai, batal) -> ditutup
//   - sudah lewat jam mulai event -> ditutup
//   - sebelum pendaftaran_buka_at -> belum_dibuka
//   - sesudah pendaftaran_tutup_at -> ditutup
//   - selain itu -> dibuka (buka/tutup kosong artinya tanpa batas waktu)
func StatusPendaftaran(status string, bukaAt, tutupAt *time.Time, mulaiAt, now time.Time) string {
	switch {
	case status == StatusDraft:
		return PendaftaranBelumDibuka
	case status != StatusTerjadwal:
		return PendaftaranDitutup
	case !now.Before(mulaiAt):
		return PendaftaranDitutup
	case bukaAt != nil && now.Before(*bukaAt):
		return PendaftaranBelumDibuka
	case tutupAt != nil && !now.Before(*tutupAt):
		return PendaftaranDitutup
	default:
		return PendaftaranDibuka
	}
}

// KuotaLamaDilepas: setelah lepas_kuota_at, sisa kuota lama boleh diambil
// pedagang baru. Kosong artinya kuota lama tidak pernah dilepas.
func KuotaLamaDilepas(lepasAt *time.Time, now time.Time) bool {
	return lepasAt != nil && !now.Before(*lepasAt)
}

// CheckInDibukaSebelumMulai: check-in pedagang dibuka sejak sekian menit
// sebelum jam mulai event (hari-H), supaya pedagang yang datang lebih awal
// untuk menata lapak tidak menumpuk di menit jam mulai. Ubah di sini saja.
const CheckInDibukaSebelumMulai = 60 * time.Minute

// AlasanTidakBisaCheckIn menilai jendela check-in sebuah event.
// "" artinya check-in boleh dilakukan sekarang.
func AlasanTidakBisaCheckIn(statusEvent string, mulaiAt, selesaiAt, now time.Time) string {
	switch statusEvent {
	case StatusDraft:
		return "Event belum diterbitkan."
	case StatusDibatalkan:
		return "Event ini dibatalkan."
	case StatusSelesaiNormal, StatusDiakhiriAwal:
		return "Event sudah selesai."
	}
	if !now.Before(selesaiAt) {
		return "Event sudah selesai."
	}
	buka := mulaiAt.Add(-CheckInDibukaSebelumMulai)
	if now.Before(buka) {
		return "Check-in dibuka mulai " + buka.In(WIB).Format("02/01 15:04") + " WIB."
	}
	return ""
}

// EventSudahSelesai: event dianggap selesai kalau statusnya selesai /
// diakhiri / dibatalkan, atau jam selesainya sudah lewat (scheduler mungkin
// belum sempat mengubah status).
func EventSudahSelesai(statusEvent string, selesaiAt, now time.Time) bool {
	switch statusEvent {
	case StatusSelesaiNormal, StatusDiakhiriAwal, StatusDibatalkan:
		return true
	}
	return !now.Before(selesaiAt)
}

// AlasanPesertaTidakBisaCheckIn menilai status keikutsertaan pedagang.
// "" artinya statusnya masih 'terdaftar' dan boleh check-in.
func AlasanPesertaTidakBisaCheckIn(statusPeserta string, checkInAt *time.Time) string {
	switch statusPeserta {
	case PesertaTerdaftar:
		return ""
	case PesertaCheckIn:
		if checkInAt != nil {
			return "Pedagang sudah check-in pukul " + checkInAt.In(WIB).Format("15:04") + " WIB."
		}
		return "Pedagang sudah check-in."
	case PesertaCheckOut:
		return "Pedagang sudah check-out dari event ini."
	case PesertaBatal:
		return "Pendaftaran pedagang di event ini sudah dibatalkan."
	case PesertaTidakHadir:
		return "Pedagang tercatat tidak hadir di event ini."
	default:
		return "Status pedagang tidak dikenali."
	}
}

// RandIntn angka acak 0..n-1 dari crypto/rand (bukan math/rand), supaya
// hasil acak tidak bisa ditebak dari luar.
func RandIntn(n int) (int, error) {
	if n <= 0 {
		return 0, errors.New("RandIntn: n harus > 0")
	}
	v, err := rand.Int(rand.Reader, big.NewInt(int64(n)))
	if err != nil {
		return 0, err
	}
	return int(v.Int64()), nil
}

// Execer dipenuhi *pgxpool.Pool maupun pgx.Tx.
type Execer interface {
	Exec(ctx context.Context, sql string, args ...any) (pgconn.CommandTag, error)
}

// Audit menulis satu baris ke audit_log (append-only, dijaga trigger DB).
// actorID nil = aksi sistem (mis. scheduler).
func Audit(ctx context.Context, db Execer, actorID *string, aksi, entitas string, entitasID, eventID *string, sebelum, sesudah any, alasan *string) error {
	var before, after []byte
	var err error
	if sebelum != nil {
		if before, err = json.Marshal(sebelum); err != nil {
			return err
		}
	}
	if sesudah != nil {
		if after, err = json.Marshal(sesudah); err != nil {
			return err
		}
	}
	_, err = db.Exec(ctx, `
		INSERT INTO audit_log (actor_id, aksi, entitas, entitas_id, event_id, sebelum, sesudah, alasan)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
		actorID, aksi, entitas, entitasID, eventID, before, after, alasan,
	)
	return err
}

// StrPtr helper kecil.
func StrPtr(s string) *string { return &s }

// IsInvalidUUID: error Postgres 22P02 (mis. :id di URL bukan UUID).
// Controller memetakannya ke 404, bukan 500.
func IsInvalidUUID(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "22P02"
}