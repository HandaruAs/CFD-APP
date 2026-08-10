package main

import (
	"context"
	"log"
	"os"

	"cfd-backend/internal/config"
	"cfd-backend/internal/database"

	"golang.org/x/crypto/bcrypt"
)

func main() {
	cfg := config.Load()

	db := database.Connect(cfg.DatabaseURL)
	defer db.Close()

	ctx := context.Background()

	email := getEnv("SEED_SUPERADMIN_EMAIL", "admin@cfd.local")
	password := getEnv("SEED_SUPERADMIN_PASSWORD", "")
	name := getEnv("SEED_SUPERADMIN_NAME", "Superadmin")

	if password == "" {
		log.Fatal("SEED_SUPERADMIN_PASSWORD wajib diisi di .env, jangan pakai password default")
	}

	// Idempotent check: kalau sudah ada user dengan role superadmin, jangan bikin lagi
	var existingCount int
	err := db.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM user_roles ur
		JOIN roles r ON r.id = ur.role_id
		WHERE r.slug = 'superadmin' AND r.deleted_at IS NULL
	`).Scan(&existingCount)
	if err != nil {
		log.Fatalf("gagal cek superadmin yang sudah ada: %v", err)
	}

	if existingCount > 0 {
		log.Println("sudah ada akun superadmin, seeder dilewati (tidak bikin duplikat)")
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
		log.Fatalf("gagal bikin user superadmin: %v", err)
	}

	var roleID string
	err = tx.QueryRow(ctx,
		`SELECT id FROM roles WHERE slug = 'superadmin' AND deleted_at IS NULL`,
	).Scan(&roleID)
	if err != nil {
		log.Fatalf("role 'superadmin' tidak ditemukan, pastikan migration 000011 sudah jalan: %v", err)
	}

	_, err = tx.Exec(ctx,
		`INSERT INTO user_roles (user_id, role_id, assigned_by) VALUES ($1, $2, NULL)`,
		userID, roleID,
	)
	if err != nil {
		log.Fatalf("gagal assign role superadmin: %v", err)
	}

	if err := tx.Commit(ctx); err != nil {
		log.Fatalf("gagal commit transaksi: %v", err)
	}

	log.Printf("berhasil bikin akun superadmin: %s (id: %s)", email, userID)
}

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}