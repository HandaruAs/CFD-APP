package main

import (
	"context"
	"log"
	"os"

	"cfd-backend/internal/config"
	"cfd-backend/internal/database"

	"golang.org/x/crypto/bcrypt"
)

// Seeder generik buat bikin akun awal role apa pun (superadmin, petugas,
// atau pedagang) langsung dari database -- dipakai karena register publik
// SENGAJA cuma bisa bikin akun pedagang, jadi superadmin & petugas nggak
// punya jalur pendaftaran sendiri (harus dibikinin lewat sini dulu, atau
// nanti lewat halaman "Manajemen User" superadmin begitu itu selesai
// dikerjakan).
//
// Cara pakai (dari folder backend/):
//
//	set SEED_ROLE=superadmin&& set SEED_EMAIL=admin@cfd.local&& set SEED_PASSWORD=passwordkuat&& go run cmd\seed\main.go
//	set SEED_ROLE=petugas&& set SEED_EMAIL=petugas1@cfd.local&& set SEED_PASSWORD=passwordkuat&& go run cmd\seed\main.go
//
// SEED_ROLE default "superadmin" kalau tidak diisi (demi kompatibel sama
// pemakaian sebelumnya). SEED_SUPERADMIN_EMAIL/PASSWORD/NAME (nama lama)
// masih dibaca sebagai fallback kalau SEED_EMAIL/PASSWORD/NAME kosong DAN
// SEED_ROLE-nya superadmin -- jadi .env yang sudah ada sebelumnya tetap
// jalan tanpa perlu diubah.
func main() {
	cfg := config.Load()

	db := database.Connect(cfg.DatabaseURL)
	defer db.Close()

	ctx := context.Background()

	role := getEnv("SEED_ROLE", "superadmin")
	if role != "superadmin" && role != "petugas" && role != "pedagang" {
		log.Fatalf("SEED_ROLE tidak valid: %q (harus superadmin, petugas, atau pedagang)", role)
	}

	email := getEnv("SEED_EMAIL", "")
	password := getEnv("SEED_PASSWORD", "")
	name := getEnv("SEED_NAME", "")

	// Fallback ke nama env var lama, khusus superadmin, biar .env yang
	// sudah ada dari sebelumnya tetap kepakai tanpa perlu diubah.
	if role == "superadmin" {
		if email == "" {
			email = getEnv("SEED_SUPERADMIN_EMAIL", "admin@cfd.local")
		}
		if password == "" {
			password = getEnv("SEED_SUPERADMIN_PASSWORD", "")
		}
		if name == "" {
			name = getEnv("SEED_SUPERADMIN_NAME", "Superadmin")
		}
	}

	if email == "" {
		log.Fatal("SEED_EMAIL wajib diisi")
	}
	if password == "" {
		log.Fatal("SEED_PASSWORD wajib diisi, jangan pakai password default")
	}
	if name == "" {
		name = "Akun " + role
	}

	// Idempotent per-email: kalau email ini sudah pernah dipakai, jangan
	// bikin lagi (daripada gagal karena constraint unik email, atau malah
	// bikin dobel kalau constraint-nya kebetulan longgar).
	var existingCount int
	err := db.QueryRow(ctx,
		`SELECT COUNT(*) FROM users WHERE email = $1 AND deleted_at IS NULL`,
		email,
	).Scan(&existingCount)
	if err != nil {
		log.Fatalf("gagal cek user yang sudah ada: %v", err)
	}
	if existingCount > 0 {
		log.Printf("email %s sudah terdaftar, seeder dilewati (tidak bikin duplikat)", email)
		return
	}

	hashed, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		log.Fatalf("gagal hash password: %v", err)
	}

	tx, err := db.Begin(ctx)
	if err != nil {
		log.Fatalf("gagal mulai transaksi: %v", err)
	}
	defer tx.Rollback(ctx)

	var userID string
	err = tx.QueryRow(ctx,
		`INSERT INTO users (email, password, name, status) VALUES ($1, $2, $3, 'active') RETURNING id`,
		email, string(hashed), name,
	).Scan(&userID)
	if err != nil {
		log.Fatalf("gagal bikin user: %v", err)
	}

	var roleID string
	err = tx.QueryRow(ctx,
		`SELECT id FROM roles WHERE slug = $1 AND deleted_at IS NULL`,
		role,
	).Scan(&roleID)
	if err != nil {
		log.Fatalf("role %q tidak ditemukan, pastikan migration seed roles sudah jalan: %v", role, err)
	}

	_, err = tx.Exec(ctx,
		`INSERT INTO user_roles (user_id, role_id, assigned_by) VALUES ($1, $2, NULL)`,
		userID, roleID,
	)
	if err != nil {
		log.Fatalf("gagal assign role: %v", err)
	}

	if err := tx.Commit(ctx); err != nil {
		log.Fatalf("gagal commit transaksi: %v", err)
	}

	log.Printf("berhasil bikin akun %s: %s (id: %s)", role, email, userID)
}

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}