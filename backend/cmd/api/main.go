package main

import (
	"log"
	"net/http"

	"cfd-backend/internal/config"
	"cfd-backend/internal/database"
	"cfd-backend/internal/handlers"
	"cfd-backend/internal/middleware"
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
	menuRepo := repository.NewMenuRepository(db)

	authHandler := handlers.NewAuthHandler(userRepo, cfg.JWTSecret)
	pedagangHandler := handlers.NewPedagangHandler(pedagangRepo)
	menuHandler := handlers.NewMenuHandler(menuRepo, userRepo)

	router := gin.Default()
	router.Use(middleware.CORSMiddleware(cfg.CORSAllowedOrigins))

	// Health check
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	// ============ ENDPOINT PUBLIK (TIDAK PERLU LOGIN) ============
	router.POST("/api/register", authHandler.RegisterPedagang)
	router.POST("/api/login", authHandler.Login)

	// ============ ENDPOINT PROTECTED (BUTUH LOGIN) ============
	// Endpoint ini bisa diakses oleh semua user yang sudah login (tanpa cek role)
	router.GET("/api/me", middleware.AuthMiddleware(cfg.JWTSecret), authHandler.Me)

	// Menu dinamis -- otomatis nyesuain isinya sama role user yang lagi
	// login (dibaca dari DB, bukan dari token), dipanggil frontend abis
	// login buat render sidebar.
	router.GET("/api/menus", middleware.AuthMiddleware(cfg.JWTSecret), menuHandler.GetMyMenus)

	// ============ ENDPOINT KHUSUS ROLE ============

	// 1. Endpoint untuk PEDAGANG saja
	router.GET("/api/pedagang/dashboard",
		middleware.AuthMiddleware(cfg.JWTSecret),
		middleware.RoleMiddleware(userRepo, "pedagang"),
		func(c *gin.Context) {
			userID, _ := c.Get("user_id")
			c.JSON(http.StatusOK, gin.H{
				"message": "Selamat datang di Dashboard Pedagang!",
				"user_id": userID,
			})
		},
	)

	// 2. Endpoint untuk PETUGAS_CFD saja
	router.GET("/api/petugas/dashboard",
		middleware.AuthMiddleware(cfg.JWTSecret),
		middleware.RoleMiddleware(userRepo, "petugas"),
		func(c *gin.Context) {
			userID, _ := c.Get("user_id")
			c.JSON(http.StatusOK, gin.H{
				"message": "Selamat datang di Dashboard Petugas CFD!",
				"user_id": userID,
			})
		},
	)

	// 3. Endpoint untuk SUPERADMIN saja
	router.GET("/api/admin/dashboard",
		middleware.AuthMiddleware(cfg.JWTSecret),
		middleware.RoleMiddleware(userRepo, "superadmin"),
		func(c *gin.Context) {
			userID, _ := c.Get("user_id")
			c.JSON(http.StatusOK, gin.H{
				"message": "Selamat datang di Dashboard Super Admin!",
				"user_id": userID,
			})
		},
	)

	// 4. Endpoint untuk SUPERADMIN DAN PETUGAS_CFD (multi-role)
	router.GET("/api/verifikasi/pengajuan",
		middleware.AuthMiddleware(cfg.JWTSecret),
		middleware.RoleMiddleware(userRepo, "superadmin", "petugas"),
		func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{
				"message": "Halaman verifikasi pengajuan (Superadmin & Petugas CFD)",
			})
		},
	)

	// 5. Contoh endpoint yang butuh login DAN permission spesifik (sudah ada)
	router.GET("/api/admin/check",
		middleware.AuthMiddleware(cfg.JWTSecret),
		middleware.PermissionMiddleware(permRepo, "users.read"),
		func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"message": "kamu punya akses users.read"})
		},
	)

	// ============ ENDPOINT PEDAGANG (Handler terpisah) ============
	router.POST("/api/pedagang/pengajuan",
		middleware.AuthMiddleware(cfg.JWTSecret),
		middleware.RoleMiddleware(userRepo, "pedagang"),
		pedagangHandler.AjukanUsaha,
	)

	router.GET("/api/pedagang/pengajuan",
		middleware.AuthMiddleware(cfg.JWTSecret),
		middleware.RoleMiddleware(userRepo, "pedagang"),
		pedagangHandler.StatusPengajuan,
	)

	log.Printf("server jalan di port %s", cfg.Port)
	if err := router.Run(":" + cfg.Port); err != nil {
		log.Fatalf("server gagal jalan: %v", err)
	}
}