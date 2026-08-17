package main

import (
	"log"
	"net/http"

	"cfd-backend/config"
	"cfd-backend/database"
	"cfd-backend/middleware"

	// Modul Repository
	userRepo "cfd-backend/modules/user/repository"
	pedagangRepo "cfd-backend/modules/pedagang/repository"
	menuRepo "cfd-backend/modules/menu/repository"
	permRepo "cfd-backend/modules/user/repository"

	// Modul Usecase
	authUsecase "cfd-backend/modules/auth/usecase"
	userUsecase "cfd-backend/modules/user/usecase"
	pedagangUsecase "cfd-backend/modules/pedagang/usecase"
	menuUsecase "cfd-backend/modules/menu/usecase"

	// Modul Controller
	authController "cfd-backend/modules/auth/controller"
	userController "cfd-backend/modules/user/controller"
	pedagangController "cfd-backend/modules/pedagang/controller"
	menuController "cfd-backend/modules/menu/controller"

	"github.com/gin-gonic/gin"
)

func main() {
	cfg := config.Load()

	db := database.Connect(cfg.DatabaseURL)
	defer db.Close()

	// 1. Init All Repositories
	userRepository := userRepo.NewUserRepository(db)
	pedagangRepository := pedagangRepo.NewPedagangRepository(db)
	menuRepository := menuRepo.NewMenuRepository(db)
	permissionRepository := permRepo.NewPermissionRepository(db)

	// 2. Init All Usecases
	authUsecase := authUsecase.NewAuthUsecase(userRepository, cfg.JWTSecret)
	userUsecase := userUsecase.NewUserUsecase(userRepository)
	pedagangUsecase := pedagangUsecase.NewPedagangUsecase(pedagangRepository)
	menuUsecase := menuUsecase.NewMenuUsecase(menuRepository, userRepository, pedagangRepository)

	// 3. Init All Controllers
	authController := authController.NewAuthController(authUsecase)
	userController := userController.NewUserController(userUsecase)
	// PedagangController butuh userUsecase untuk membuat user baru saat ditambahkan oleh Superadmin
	pedagangController := pedagangController.NewPedagangController(pedagangUsecase, userUsecase)
	menuController := menuController.NewMenuController(menuUsecase)

	router := gin.Default()
	router.Use(middleware.CORSMiddleware(cfg.CORSAllowedOrigins))

	// Health check
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	// ============ ENDPOINT PUBLIK (TIDAK PERLU LOGIN) ============
	router.POST("/api/register", authController.RegisterPedagang)
	router.POST("/api/login", authController.Login)

	// ============ ENDPOINT PROTECTED (BUTUH LOGIN) ============
	// Endpoint ini bisa diakses oleh semua user yang sudah login (tanpa cek role)
	router.GET("/api/me", middleware.AuthMiddleware(cfg.JWTSecret), userController.Me)

	// Menu dinamis
	router.GET("/api/menus", middleware.AuthMiddleware(cfg.JWTSecret), menuController.GetMyMenus)

	// ============ ENDPOINT KHUSUS ROLE ============

	// 1. Endpoint untuk PEDAGANG saja
	router.GET("/api/pedagang/dashboard",
		middleware.AuthMiddleware(cfg.JWTSecret),
		middleware.RoleMiddleware(userRepository, "pedagang"),
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
		middleware.RoleMiddleware(userRepository, "petugas"),
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
		middleware.RoleMiddleware(userRepository, "superadmin"),
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
		middleware.RoleMiddleware(userRepository, "superadmin", "petugas"),
		func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{
				"message": "Halaman verifikasi pengajuan (Superadmin & Petugas CFD)",
			})
		},
	)

	// 5. Contoh endpoint yang butuh login DAN permission spesifik
	router.GET("/api/admin/check",
		middleware.AuthMiddleware(cfg.JWTSecret),
		middleware.PermissionMiddleware(permissionRepository, "users.read"),
		func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"message": "kamu punya akses users.read"})
		},
	)

	// ============ ENDPOINT PEDAGANG (Handler terpisah) ============
	router.POST("/api/pedagang/pengajuan",
		middleware.AuthMiddleware(cfg.JWTSecret),
		middleware.RoleMiddleware(userRepository, "pedagang"),
		pedagangController.AjukanUsaha,
	)

	router.GET("/api/pedagang/pengajuan",
		middleware.AuthMiddleware(cfg.JWTSecret),
		middleware.RoleMiddleware(userRepository, "pedagang"),
		pedagangController.StatusPengajuan,
	)

	// ============ ENDPOINT SUPERADMIN (Manajemen Pedagang) ============
	router.POST("/api/admin/users/pedagang",
		middleware.AuthMiddleware(cfg.JWTSecret),
		middleware.RoleMiddleware(userRepository, "superadmin"),
		pedagangController.CreatePedagangByAdmin,
	)

	router.GET("/api/admin/users/pedagang", 
		middleware.AuthMiddleware(cfg.JWTSecret),
		middleware.RoleMiddleware(userRepository, "superadmin"),
		pedagangController.ListPedagangByAdmin,
	)

	router.GET("/api/admin/users/pedagang/stats",
	middleware.AuthMiddleware(cfg.JWTSecret),
	middleware.RoleMiddleware(userRepository, "superadmin"),
	pedagangController.GetPedagangStats,
	)

	router.GET("/api/admin/users/pedagang/:id",
	middleware.AuthMiddleware(cfg.JWTSecret),
	middleware.RoleMiddleware(userRepository, "superadmin"),
	pedagangController.GetPedagangByID,
	)

	router.DELETE("/api/admin/users/pedagang/:id",
	middleware.AuthMiddleware(cfg.JWTSecret),
	middleware.RoleMiddleware(userRepository, "superadmin"),
	pedagangController.DeletePedagangByAdmin,
	)


	log.Printf("server jalan di port %s", cfg.Port)
	if err := router.Run(":" + cfg.Port); err != nil {
		log.Fatalf("server gagal jalan: %v", err)
	}
}