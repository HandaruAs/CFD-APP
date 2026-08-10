package main

import (
	"log"
	"net/http"

	"cfd-backend/internal/config"
	"cfd-backend/internal/database"
	"cfd-backend/internal/handlers"
	"cfd-backend/internal/middleware"
	"cfd-backend/internal/oauth"
	"cfd-backend/internal/repository"

	"github.com/gin-gonic/gin"
)

func main() {
	cfg := config.Load()

	db := database.Connect(cfg.DatabaseURL)
	defer db.Close()

	userRepo := repository.NewUserRepository(db)
	permRepo := repository.NewPermissionRepository(db)
	pedagangRepo := repository.NewPedagangRepository(db)

	googleVerifier := oauth.NewGoogleVerifier(cfg.GoogleClientID)

	authHandler := handlers.NewAuthHandler(userRepo, cfg.JWTSecret, googleVerifier)
	pedagangHandler := handlers.NewPedagangHandler(pedagangRepo)

	router := gin.Default()
	router.Use(middleware.CORSMiddleware(cfg.CORSAllowedOrigins))

	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	// Route publik, gak butuh login
	router.POST("/api/register", authHandler.RegisterPedagang)
	router.POST("/api/login", authHandler.Login)

	// Register/login pedagang lewat Google. Satu endpoint ini otomatis
	// bikin akun baru (role pedagang) kalau google_id-nya belum pernah
	// terdaftar, atau login kalau sudah pernah.
	router.POST("/api/auth/google", authHandler.GoogleLogin)

	// Route yang cuma butuh login (siapapun rolenya)
	router.GET("/api/me", middleware.AuthMiddleware(cfg.JWTSecret), authHandler.Me)

	// Route pengajuan usaha — dipanggil dari dashboard setelah login
	// (baik lewat email/password ataupun nanti Google OAuth)
	router.POST("/api/pedagang/pengajuan", middleware.AuthMiddleware(cfg.JWTSecret), pedagangHandler.AjukanUsaha)
	router.GET("/api/pedagang/pengajuan", middleware.AuthMiddleware(cfg.JWTSecret), pedagangHandler.StatusPengajuan)

	// Contoh route yang butuh login DAN permission spesifik
	router.GET("/api/admin/check",
		middleware.AuthMiddleware(cfg.JWTSecret),
		middleware.PermissionMiddleware(permRepo, "users.read"),
		func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"message": "kamu punya akses users.read"})
		},
	)

	log.Printf("server jalan di port %s", cfg.Port)
	if err := router.Run(":" + cfg.Port); err != nil {
		log.Fatalf("server gagal jalan: %v", err)
	}
}