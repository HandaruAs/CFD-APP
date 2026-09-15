// Package kodelapak: satu sumber kebenaran buat format nomor_lapak
// ("<KODE_EVENT>-XXXXXX", 6 digit acak) dan helper deteksi unique-
// violation Postgres -- dipakai dua tempat sekarang: klaim langsung
// (modules/pedagang/lapak, generate kode saat itu juga) dan generate
// pool slot (modules/petugas/acak-lapak, generate kode di muka waktu
// petugas klik "Acak Lapak"). Dulu logic ini cuma ada di lapak_repository.go
// dan bakal ke-duplikat kalau acak-lapak nulis versi sendiri -- disatuin
// di sini biar kalau format kode berubah, cukup ubah 1 tempat.
package kodelapak

import (
	"errors"
	"fmt"
	"math/rand/v2"

	"github.com/jackc/pgx/v5/pgconn"
)

const digitRange = 1_000_000

// Generate bikin nomor 6 digit acak (000000-999999) dengan prefix kode
// event, format "CFD-001234".
func Generate(kodeEvent string) string {
	return fmt.Sprintf("%s-%06d", kodeEvent, rand.IntN(digitRange))
}

// IsUniqueViolation cek apakah error dari Postgres itu spesifik
// pelanggaran UNIQUE constraint (kode 23505). constraintName opsional --
// kosongin ("") kalau cuma mau tau "ini unique violation apa bukan" tanpa
// peduli constraint mana; isi kalau perlu mastiin constraint yang mana
// (biar gak salah tangkep, mis. constraint (pedagang_id, session_id) vs
// constraint (session_id, nomor_lapak)).
func IsUniqueViolation(err error, constraintName string) bool {
	var pgErr *pgconn.PgError
	if !errors.As(err, &pgErr) || pgErr.Code != "23505" {
		return false
	}
	if constraintName == "" {
		return true
	}
	return pgErr.ConstraintName == constraintName
}