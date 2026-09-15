// Package sesi berisi helper yang dipakai bareng oleh beberapa modul
// (pedagang/lapak, petugas/sisa-lapak, petugas/acak-lapak) buat
// nentuin "sesi CFD hari ini yang mana" secara konsisten.
package sesi

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ResolveSesiHariIni ambil ID sesi CFD hari ini, APAPUN statusnya
// (is_active true maupun false) -- dipakai buat keperluan hitungan
// kapasitas lapak (lapak_klaim / jalan_kapasitas_sesi), BUKAN buat
// keperluan operasional petugas (jam scan-QR dkk tetap pakai
// modules/operasional.GetSesiHariIni yang filter is_active = true).
//
// Kalau belum ada row cfd_sessions sama sekali buat hari ini, fungsi ini
// AUTO-BIKIN satu dengan is_active = false, supaya row ini "gak kelihatan"
// dari sudut pandang petugas -- guard di operasional_usecase
// (BukaSesiManual dkk) tetap aman karena dia filter is_active = true.
//
// PENTING: semua modul yang butuh tau "sesi mana yang dipakai buat
// hitung kapasitas hari ini" HARUS lewat fungsi ini, bukan nulis query
// sendiri-sendiri -- kalau enggak, gampang jadi gak sinkron (contoh nyata:
// dashboard "Sisa Lapak" sempat nampilin 0 padahal udah ada yang klaim,
// gara-gara nyari sesi pakai filter is_active = true doang).
func ResolveSesiHariIni(ctx context.Context, db *pgxpool.Pool) (string, error) {
	var id string
	err := db.QueryRow(ctx,
		`SELECT id FROM cfd_sessions
		 WHERE deleted_at IS NULL AND tanggal = CURRENT_DATE
		 ORDER BY created_at ASC
		 LIMIT 1`,
	).Scan(&id)
	if err == nil {
		return id, nil
	}
	if err != pgx.ErrNoRows {
		return "", err
	}

	namaSesi := "CFD " + time.Now().Format("02 January 2006")
	err = db.QueryRow(ctx,
		`INSERT INTO cfd_sessions (nama_sesi, tanggal, status, is_active)
		 VALUES ($1, CURRENT_DATE, 'aktif', false)
		 RETURNING id`,
		namaSesi,
	).Scan(&id)
	if err == nil {
		return id, nil
	}

	// Race: ada pedagang lain (atau petugas) yang barusan bikin baris buat
	// tanggal ini duluan, di antara SELECT di atas sama INSERT ini --
	// unique index uq_cfd_sessions_tanggal yang nolak. Bukan error beneran,
	// tinggal ambil baris yang menang race itu.
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23505" {
		err = db.QueryRow(ctx,
			`SELECT id FROM cfd_sessions
			 WHERE deleted_at IS NULL AND tanggal = CURRENT_DATE
			 ORDER BY created_at ASC
			 LIMIT 1`,
		).Scan(&id)
		if err != nil {
			return "", err
		}
		return id, nil
	}

	return "", err
}