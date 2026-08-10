package config

import (
	"log"
	"os"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	Port               string
	DatabaseURL        string
	JWTSecret          string
	CORSAllowedOrigins []string
	GoogleClientID     string
}

func Load() *Config {
	if err := godotenv.Load(); err != nil {
		log.Println("tidak menemukan file .env, lanjut pakai environment variable yang ada")
	}

	cfg := &Config{
		Port:               getEnv("PORT", "8080"),
		DatabaseURL:        getEnv("DATABASE_URL", ""),
		JWTSecret:          getEnv("JWT_SECRET", ""),
		CORSAllowedOrigins: strings.Split(getEnv("CORS_ALLOWED_ORIGINS", "http://localhost:3000"), ","),
		GoogleClientID:     getEnv("GOOGLE_CLIENT_ID", ""),
	}

	if cfg.DatabaseURL == "" {
		log.Fatal("DATABASE_URL wajib diisi di .env")
	}

	if cfg.JWTSecret == "" {
		log.Fatal("JWT_SECRET wajib diisi di .env, jangan biarkan kosong (token bisa gampang dipalsukan)")
	}
	if len(cfg.JWTSecret) < 32 {
		log.Println("PERINGATAN: JWT_SECRET terlalu pendek (<32 karakter), sebaiknya pakai random string yang lebih panjang")
	}

	if cfg.GoogleClientID == "" {
		log.Println("PERINGATAN: GOOGLE_CLIENT_ID belum diisi, endpoint /api/auth/google akan selalu menolak token")
	}

	return cfg
}

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}