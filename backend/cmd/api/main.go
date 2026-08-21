package main

import (
	"context"
	"log"
	"time"

	"cfd-backend/config"
	"cfd-backend/database"
	"cfd-backend/middleware"

	// Modul Repository
	menuRepo "cfd-backend/modules/menu/repository"
	operasionalRepo "cfd-backend/modules/operasional/repository"
	pedagangRepo "cfd-backend/modules/pedagang/repository"
	permRepo "cfd-backend/modules/user/repository"
	userRepo "cfd-backend/modules/user/repository"

	// Modul Repository - Scan QR
	scanRepo "cfd-backend/modules/petugas/scan-qr/repository"

	// Modul Usecase
	authUsecase "cfd-backend/modules/auth/usecase"
	menuUsecase "cfd-backend/modules/menu/usecase"
	operasionalUsecase "cfd-backend/modules/operasional/usecase"
	pedagangUsecase "cfd-backend/modules/pedagang/usecase"
	userUsecase "cfd-backend/modules/user/usecase"

	// Modul Usecase - Scan QR
	scanUsecase "cfd-backend/modules/petugas/scan-qr/usecase"

	// Modul Controller
	authController "cfd-backend/modules/auth/controller"
	menuController "cfd-backend/modules/menu/controller"
	operasionalController "cfd-backend/modules/operasional/controller"
	pedagangController "cfd-backend/modules/pedagang/controller"
	userController "cfd-backend/modules/user/controller"

	// Modul Controller - Scan QR
	scanController "cfd-backend/modules/petugas/scan-qr/controller"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/cors"
	"github.com/gofiber/fiber/v3/middleware/logger"
	"github.com/gofiber/fiber/v3/middleware/recover"
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
	operasionalRepository := operasionalRepo.NewOperasionalRepository(db)

	// 1a. Init Repository Scan QR
	scanRepository := scanRepo.NewScanRepository(db)

	// 2. Init All Usecases
	authUsecase := authUsecase.NewAuthUsecase(userRepository, cfg.JWTSecret)
	userUsecase := userUsecase.NewUserUsecase(userRepository)
	pedagangUsecase := pedagangUsecase.NewPedagangUsecase(pedagangRepository)
	menuUsecase := menuUsecase.NewMenuUsecase(menuRepository, userRepository, pedagangRepository)
	operasionalUsecase := operasionalUsecase.NewOperasionalUsecase(operasionalRepository)

	// 2a. Init Usecase Scan QR
	scanUsecase := scanUsecase.NewScanUsecase(scanRepository)

	// 3. Init All Controllers
	authController := authController.NewAuthController(authUsecase)
	userController := userController.NewUserController(userUsecase)
	pedagangController := pedagangController.NewPedagangController(pedagangUsecase, userUsecase)
	menuController := menuController.NewMenuController(menuUsecase)
	operasionalController := operasionalController.NewOperasionalController(operasionalUsecase)

	// 3a. Init Controller Scan QR
	scanController := scanController.NewScanController(scanUsecase)

	// 4. Init Fiber App
	app := fiber.New(fiber.Config{
		// Biar error handler-nya konsisten
		ErrorHandler: func(c fiber.Ctx, err error) error {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": err.Error(),
			})
		},
	})

	// Middleware
	app.Use(recover.New())
	app.Use(logger.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins:     cfg.CORSAllowedOrigins,
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		AllowCredentials: true,
	}))

	// Health check
	app.Get("/health", func(c fiber.Ctx) error {
		return c.Status(200).JSON(fiber.Map{"status": "ok"})
	})

	// ============ ENDPOINT PUBLIK (TIDAK PERLU LOGIN) ============
	app.Post("/api/register", authController.RegisterPedagang)
	app.Post("/api/login", authController.Login)

	// ============ ENDPOINT PROTECTED (BUTUH LOGIN) ============
	app.Get("/api/me", middleware.AuthMiddleware(cfg.JWTSecret), userController.Me)

	// Menu dinamis
	app.Get("/api/menus", middleware.AuthMiddleware(cfg.JWTSecret), menuController.GetMyMenus)

	// ============ MENU MANAGEMENT (SUPERADMIN SAJA) ============
	app.Get("/api/admin/menus",
		middleware.AuthMiddleware(cfg.JWTSecret),
		middleware.RoleMiddleware(userRepository, "superadmin"),
		menuController.ListAllMenus,
	)

	app.Post("/api/admin/menus",
		middleware.AuthMiddleware(cfg.JWTSecret),
		middleware.RoleMiddleware(userRepository, "superadmin"),
		menuController.CreateMenu,
	)

	app.Put("/api/admin/menus/:id",
		middleware.AuthMiddleware(cfg.JWTSecret),
		middleware.RoleMiddleware(userRepository, "superadmin"),
		menuController.UpdateMenu,
	)

	app.Delete("/api/admin/menus/:id",
		middleware.AuthMiddleware(cfg.JWTSecret),
		middleware.RoleMiddleware(userRepository, "superadmin"),
		menuController.DeleteMenu,
	)

	app.Get("/api/admin/roles",
		middleware.AuthMiddleware(cfg.JWTSecret),
		middleware.RoleMiddleware(userRepository, "superadmin"),
		menuController.ListRoles,
	)

	// ============ ENDPOINT KHUSUS ROLE ============

	// 1. Endpoint untuk PEDAGANG saja
	app.Get("/api/pedagang/dashboard",
		middleware.AuthMiddleware(cfg.JWTSecret),
		middleware.RoleMiddleware(userRepository, "pedagang"),
		func(c fiber.Ctx) error {
			userID := c.Locals("user_id")
			return c.Status(200).JSON(fiber.Map{
				"message": "Selamat datang di Dashboard Pedagang!",
				"user_id": userID,
			})
		},
	)

	// 2. Endpoint untuk PETUGAS_CFD saja
	app.Get("/api/petugas/dashboard",
		middleware.AuthMiddleware(cfg.JWTSecret),
		middleware.RoleMiddleware(userRepository, "petugas"),
		func(c fiber.Ctx) error {
			userID := c.Locals("user_id")
			return c.Status(200).JSON(fiber.Map{
				"message": "Selamat datang di Dashboard Petugas CFD!",
				"user_id": userID,
			})
		},
	)

	// 3. Endpoint untuk SUPERADMIN saja
	app.Get("/api/admin/dashboard",
		middleware.AuthMiddleware(cfg.JWTSecret),
		middleware.RoleMiddleware(userRepository, "superadmin"),
		func(c fiber.Ctx) error {
			userID := c.Locals("user_id")
			return c.Status(200).JSON(fiber.Map{
				"message": "Selamat datang di Dashboard Super Admin!",
				"user_id": userID,
			})
		},
	)

	// 4. Endpoint untuk SUPERADMIN DAN PETUGAS_CFD (multi-role)
	app.Get("/api/verifikasi/pengajuan",
		middleware.AuthMiddleware(cfg.JWTSecret),
		middleware.RoleMiddleware(userRepository, "superadmin", "petugas"),
		func(c fiber.Ctx) error {
			return c.Status(200).JSON(fiber.Map{
				"message": "Halaman verifikasi pengajuan (Superadmin & Petugas CFD)",
			})
		},
	)

	// 5. Contoh endpoint yang butuh login DAN permission spesifik
	app.Get("/api/admin/check",
		middleware.AuthMiddleware(cfg.JWTSecret),
		middleware.PermissionMiddleware(permissionRepository, "users.read"),
		func(c fiber.Ctx) error {
			return c.Status(200).JSON(fiber.Map{"message": "kamu punya akses users.read"})
		},
	)

	// ============ ENDPOINT PETUGAS - JAM OPERASIONAL ============
	// Pakai permission jadwal.read / jadwal.manage yang sudah di-seed di
	// migration 000011/000012 dan sudah di-assign ke role petugas -- jadi
	// nggak perlu migration permission baru.
	app.Get("/api/petugas/jam-operasional",
		middleware.AuthMiddleware(cfg.JWTSecret),
		middleware.PermissionMiddleware(permissionRepository, "jadwal.read"),
		operasionalController.GetStatusOperasional,
	)

	app.Patch("/api/petugas/jam-operasional/sesi",
		middleware.AuthMiddleware(cfg.JWTSecret),
		middleware.PermissionMiddleware(permissionRepository, "jadwal.manage"),
		operasionalController.SimpanSesi,
	)

	app.Patch("/api/petugas/jam-operasional/sesi/perpanjang",
		middleware.AuthMiddleware(cfg.JWTSecret),
		middleware.PermissionMiddleware(permissionRepository, "jadwal.manage"),
		operasionalController.PerpanjangSesi,
	)

	app.Patch("/api/petugas/jam-operasional/sesi/akhiri",
		middleware.AuthMiddleware(cfg.JWTSecret),
		middleware.PermissionMiddleware(permissionRepository, "jadwal.manage"),
		operasionalController.AkhiriSesiLebihAwal,
	)

	app.Patch("/api/petugas/jam-operasional/pendaftaran",
		middleware.AuthMiddleware(cfg.JWTSecret),
		middleware.PermissionMiddleware(permissionRepository, "jadwal.manage"),
		operasionalController.UpdatePendaftaran,
	)

	app.Get("/api/petugas/jam-operasional/jadwal-mingguan",
		middleware.AuthMiddleware(cfg.JWTSecret),
		middleware.PermissionMiddleware(permissionRepository, "jadwal.read"),
		operasionalController.GetJadwalMingguan,
	)

	app.Patch("/api/petugas/jam-operasional/jadwal-mingguan",
		middleware.AuthMiddleware(cfg.JWTSecret),
		middleware.PermissionMiddleware(permissionRepository, "jadwal.manage"),
		operasionalController.UpdateJadwalMingguan,
	)

	// ============ ENDPOINT PETUGAS - SCAN QR ============
	// Menggunakan permission pedagang.scan yang ditambahkan di migration 000023
	app.Post("/api/petugas/scan",
		middleware.AuthMiddleware(cfg.JWTSecret),
		middleware.PermissionMiddleware(permissionRepository, "pedagang.scan"),
		scanController.VerifyQR,
	)

	app.Post("/api/petugas/check-in",
		middleware.AuthMiddleware(cfg.JWTSecret),
		middleware.PermissionMiddleware(permissionRepository, "pedagang.scan"),
		scanController.CheckIn,
	)

	app.Get("/api/petugas/riwayat-scan",
		middleware.AuthMiddleware(cfg.JWTSecret),
		middleware.PermissionMiddleware(permissionRepository, "pedagang.scan"),
		scanController.GetRiwayatScan,
	)

	// ============ ENDPOINT PEDAGANG ============
	app.Post("/api/pedagang/pengajuan",
		middleware.AuthMiddleware(cfg.JWTSecret),
		middleware.RoleMiddleware(userRepository, "pedagang"),
		pedagangController.AjukanUsaha,
	)

	app.Get("/api/pedagang/pengajuan",
		middleware.AuthMiddleware(cfg.JWTSecret),
		middleware.RoleMiddleware(userRepository, "pedagang"),
		pedagangController.StatusPengajuan,
	)

	// ============ ENDPOINT SUPERADMIN (Manajemen User) ============

	// Pedagang
	app.Post("/api/admin/users/pedagang",
		middleware.AuthMiddleware(cfg.JWTSecret),
		middleware.RoleMiddleware(userRepository, "superadmin"),
		pedagangController.CreatePedagangByAdmin,
	)

	app.Get("/api/admin/users/pedagang",
		middleware.AuthMiddleware(cfg.JWTSecret),
		middleware.RoleMiddleware(userRepository, "superadmin"),
		pedagangController.ListPedagangByAdmin,
	)

	app.Get("/api/admin/users/pedagang/stats",
		middleware.AuthMiddleware(cfg.JWTSecret),
		middleware.RoleMiddleware(userRepository, "superadmin"),
		pedagangController.GetPedagangStats,
	)

	// Petugas
	app.Get("/api/admin/users/petugas",
		middleware.AuthMiddleware(cfg.JWTSecret),
		middleware.RoleMiddleware(userRepository, "superadmin"),
		userController.ListUsersByRole,
	)

	app.Post("/api/admin/users/petugas",
		middleware.AuthMiddleware(cfg.JWTSecret),
		middleware.RoleMiddleware(userRepository, "superadmin"),
		userController.CreateUserByRole,
	)

	// --- TAMBAHAN: Edit & Delete Petugas ---
	app.Get("/api/admin/users/petugas/:id",
		middleware.AuthMiddleware(cfg.JWTSecret),
		middleware.RoleMiddleware(userRepository, "superadmin"),
		userController.GetUserByID,
	)

	app.Put("/api/admin/users/petugas/:id",
		middleware.AuthMiddleware(cfg.JWTSecret),
		middleware.RoleMiddleware(userRepository, "superadmin"),
		userController.UpdateUserByRole,
	)

	app.Delete("/api/admin/users/petugas/:id",
		middleware.AuthMiddleware(cfg.JWTSecret),
		middleware.RoleMiddleware(userRepository, "superadmin"),
		userController.DeleteUserByRole,
	)

	// Superadmin
	app.Get("/api/admin/users/superadmin",
		middleware.AuthMiddleware(cfg.JWTSecret),
		middleware.RoleMiddleware(userRepository, "superadmin"),
		userController.ListUsersByRole,
	)

	app.Post("/api/admin/users/superadmin",
		middleware.AuthMiddleware(cfg.JWTSecret),
		middleware.RoleMiddleware(userRepository, "superadmin"),
		userController.CreateUserByRole,
	)

	app.Get("/api/admin/users/superadmin/:id",
		middleware.AuthMiddleware(cfg.JWTSecret),
		middleware.RoleMiddleware(userRepository, "superadmin"),
		userController.GetUserByID,
	)

	app.Put("/api/admin/users/superadmin/:id",
		middleware.AuthMiddleware(cfg.JWTSecret),
		middleware.RoleMiddleware(userRepository, "superadmin"),
		userController.UpdateUserByRole,
	)

	// Delete superadmin pakai handler khusus (bukan DeleteUserByRole) --
	// ada guard self-delete & last-superadmin di usecase-nya.
	app.Delete("/api/admin/users/superadmin/:id",
		middleware.AuthMiddleware(cfg.JWTSecret),
		middleware.RoleMiddleware(userRepository, "superadmin"),
		userController.DeleteSuperadmin,
	)

	// Statistik
	app.Get("/api/admin/users/stats",
		middleware.AuthMiddleware(cfg.JWTSecret),
		middleware.RoleMiddleware(userRepository, "superadmin"),
		userController.GetUserStats,
	)

	// Pedagang Detail
	app.Get("/api/admin/users/pedagang/:id",
		middleware.AuthMiddleware(cfg.JWTSecret),
		middleware.RoleMiddleware(userRepository, "superadmin"),
		pedagangController.GetPedagangByID,
	)

	app.Delete("/api/admin/users/pedagang/:id",
		middleware.AuthMiddleware(cfg.JWTSecret),
		middleware.RoleMiddleware(userRepository, "superadmin"),
		pedagangController.DeletePedagangByAdmin,
	)

	// ============ BACKGROUND JOB: AUTO MULAI/SELESAI SESI CFD ============
	// Jalan sendiri di belakang tiap 1 menit, LEPAS dari ada/nggaknya
	// petugas yang buka halaman Jam Operasional -- ini yang bikin sesi
	// CFD beneran "real-time" sesuai jadwal_mingguan, bukan cuma tergantung
	// petugas klik "Simpan Perubahan" tiap minggu.
	go func() {
		// Langsung jalanin sekali pas start, biar kalau server baru
		// nyala di tengah jam operasional (misal abis restart), sesinya
		// langsung ke-detect, nggak nunggu 1 menit pertama.
		if err := operasionalUsecase.TickJadwalOtomatis(context.Background()); err != nil {
			log.Printf("scheduler jam-operasional: tick awal gagal: %v", err)
		}

		ticker := time.NewTicker(1 * time.Minute)
		defer ticker.Stop()
		for range ticker.C {
			if err := operasionalUsecase.TickJadwalOtomatis(context.Background()); err != nil {
				log.Printf("scheduler jam-operasional: tick gagal: %v", err)
			}
		}
	}()

	log.Printf("server jalan di port %s", cfg.Port)
	if err := app.Listen(":" + cfg.Port); err != nil {
		log.Fatalf("server gagal jalan: %v", err)
	}
}