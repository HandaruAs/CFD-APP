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

	// Modul Repository - Lapak
	lapakRepo "cfd-backend/modules/pedagang/lapak/repository"

	// Modul Repository - Scan QR
	scanRepo "cfd-backend/modules/petugas/scan-qr/repository"

	// Modul Repository - Laporan
	laporanRepo "cfd-backend/modules/petugas/laporan/repository"

	// ===== TAMBAHKAN: Repository Sisa Lapak =====
	sisaLapakRepo "cfd-backend/modules/petugas/sisa-lapak/repository"

	// Modul Usecase
	authUsecase "cfd-backend/modules/auth/usecase"
	menuUsecase "cfd-backend/modules/menu/usecase"
	operasionalUsecase "cfd-backend/modules/operasional/usecase"
	pedagangUsecase "cfd-backend/modules/pedagang/usecase"
	userUsecase "cfd-backend/modules/user/usecase"

	// Modul Usecase - Lapak
	lapakUsecase "cfd-backend/modules/pedagang/lapak/usecase"

	// Modul Usecase - Scan QR
	scanUsecase "cfd-backend/modules/petugas/scan-qr/usecase"

	// Modul Usecase - Laporan
	laporanUsecase "cfd-backend/modules/petugas/laporan/usecase"

	// ===== TAMBAHKAN: Usecase Sisa Lapak =====
	sisaLapakUsecase "cfd-backend/modules/petugas/sisa-lapak/usecase"

	// Modul Controller
	authController "cfd-backend/modules/auth/controller"
	menuController "cfd-backend/modules/menu/controller"
	operasionalController "cfd-backend/modules/operasional/controller"
	pedagangController "cfd-backend/modules/pedagang/controller"
	userController "cfd-backend/modules/user/controller"

	// Modul Controller - Lapak
	lapakController "cfd-backend/modules/pedagang/lapak/controller"

	// Modul Controller - Scan QR
	scanController "cfd-backend/modules/petugas/scan-qr/controller"

	// Modul Controller - Laporan
	laporanController "cfd-backend/modules/petugas/laporan/controller"

	// ===== TAMBAHKAN: Controller Sisa Lapak =====
	sisaLapakController "cfd-backend/modules/petugas/sisa-lapak/controller"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/cors"
	"github.com/gofiber/fiber/v3/middleware/logger"
	"github.com/gofiber/fiber/v3/middleware/recover"
)

func main() {
	cfg := config.Load()

	db := database.Connect(cfg.DatabaseURL)
	defer db.Close()

	// ============================================================
	// 1. INIT REPOSITORIES
	// ============================================================
	userRepository := userRepo.NewUserRepository(db)
	pedagangRepository := pedagangRepo.NewPedagangRepository(db)
	menuRepository := menuRepo.NewMenuRepository(db)
	permissionRepository := permRepo.NewPermissionRepository(db)
	operasionalRepository := operasionalRepo.NewOperasionalRepository(db)

	// 1a. Repository Lapak
	lapakRepository := lapakRepo.NewLapakRepository(db)

	// 1b. Repository Scan QR
	scanRepository := scanRepo.NewScanRepository(db)

	// 1c. Repository Laporan
	laporanRepository := laporanRepo.NewLaporanRepository(db)

	// ===== TAMBAHKAN: Repository Sisa Lapak =====
	sisaLapakRepository := sisaLapakRepo.NewRepository(db)

	// ============================================================
	// 2. INIT USECASES
	// ============================================================
	authUsecase := authUsecase.NewAuthUsecase(userRepository, cfg.JWTSecret)
	userUsecase := userUsecase.NewUserUsecase(userRepository)
	pedagangUsecase := pedagangUsecase.NewPedagangUsecase(pedagangRepository)
	menuUsecase := menuUsecase.NewMenuUsecase(menuRepository, userRepository, pedagangRepository)
	operasionalUsecase := operasionalUsecase.NewOperasionalUsecase(operasionalRepository)

	// 2a. Usecase Lapak
	lapakUsecase := lapakUsecase.NewLapakUsecase(lapakRepository)

	// 2b. Usecase Scan QR
	scanUsecase := scanUsecase.NewScanUsecase(scanRepository)

	// 2c. Usecase Laporan
	laporanUsecase := laporanUsecase.NewLaporanUsecase(laporanRepository)

	// ===== TAMBAHKAN: Usecase Sisa Lapak =====
	sisaLapakUsecase := sisaLapakUsecase.NewUsecase(sisaLapakRepository)

	// ============================================================
	// 3. INIT CONTROLLERS
	// ============================================================
	authController := authController.NewAuthController(authUsecase)
	userController := userController.NewUserController(userUsecase)
	pedagangController := pedagangController.NewPedagangController(pedagangUsecase, userUsecase)
	menuController := menuController.NewMenuController(menuUsecase)
	operasionalController := operasionalController.NewOperasionalController(operasionalUsecase)

	// 3a. Controller Lapak
	lapakController := lapakController.NewLapakController(lapakUsecase)

	// 3b. Controller Scan QR
	scanController := scanController.NewScanController(scanUsecase)

	// 3c. Controller Laporan
	laporanController := laporanController.NewLaporanController(laporanUsecase)

	// ===== TAMBAHKAN: Controller Sisa Lapak =====
	sisaLapakController := sisaLapakController.NewController(sisaLapakUsecase)

	// ============================================================
	// 4. INIT FIBER APP
	// ============================================================
	app := fiber.New(fiber.Config{
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

	// ============================================================
	// 5. ENDPOINT PUBLIK (TIDAK PERLU LOGIN)
	// ============================================================
	app.Post("/api/register", authController.RegisterPedagang)
	app.Post("/api/login", authController.Login)

	// ============================================================
	// 6. ENDPOINT PROTECTED (BUTUH LOGIN)
	// ============================================================
	app.Get("/api/me", middleware.AuthMiddleware(cfg.JWTSecret), userController.Me)
	app.Get("/api/menus", middleware.AuthMiddleware(cfg.JWTSecret), menuController.GetMyMenus)

	// ============================================================
	// 7. MENU MANAGEMENT (SUPERADMIN SAJA)
	// ============================================================
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

	// ============================================================
	// 8. ENDPOINT KHUSUS ROLE
	// ============================================================

	// 8a. Pedagang
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

	// 8b. Petugas
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

	// 8c. Superadmin
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

	// 8d. Multi-role (Superadmin & Petugas)
	app.Get("/api/verifikasi/pengajuan",
		middleware.AuthMiddleware(cfg.JWTSecret),
		middleware.RoleMiddleware(userRepository, "superadmin", "petugas"),
		func(c fiber.Ctx) error {
			return c.Status(200).JSON(fiber.Map{
				"message": "Halaman verifikasi pengajuan (Superadmin & Petugas CFD)",
			})
		},
	)

	// 8e. Contoh endpoint dengan permission spesifik
	app.Get("/api/admin/check",
		middleware.AuthMiddleware(cfg.JWTSecret),
		middleware.PermissionMiddleware(permissionRepository, "users.read"),
		func(c fiber.Ctx) error {
			return c.Status(200).JSON(fiber.Map{"message": "kamu punya akses users.read"})
		},
	)

	// ============================================================
	// 9. ENDPOINT PETUGAS - JAM OPERASIONAL
	// ============================================================
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

	// ============================================================
	// 10. ENDPOINT PETUGAS - SCAN QR
	// ============================================================
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

	// ============================================================
	// 11. ENDPOINT PETUGAS - LAPORAN
	// ============================================================
	app.Get("/api/petugas/laporan",
		middleware.AuthMiddleware(cfg.JWTSecret),
		middleware.PermissionMiddleware(permissionRepository, "pedagang.read"),
		laporanController.GetLaporan,
	)

	app.Get("/api/petugas/laporan/stats",
		middleware.AuthMiddleware(cfg.JWTSecret),
		middleware.PermissionMiddleware(permissionRepository, "pedagang.read"),
		laporanController.GetStats,
	)

	// ============================================================
	// 12. ENDPOINT PETUGAS - SISA LAPAK (BARU)
	// ============================================================
	app.Get("/api/petugas/sisa-lapak",
		middleware.AuthMiddleware(cfg.JWTSecret),
		middleware.PermissionMiddleware(permissionRepository, "pedagang.read"),
		sisaLapakController.GetSisaLapak,
	)

	app.Get("/api/petugas/sisa-lapak/instansi",
		middleware.AuthMiddleware(cfg.JWTSecret),
		middleware.PermissionMiddleware(permissionRepository, "pedagang.read"),
		sisaLapakController.GetInstansi,
	)

	app.Post("/api/petugas/sisa-lapak",
		middleware.AuthMiddleware(cfg.JWTSecret),
		middleware.PermissionMiddleware(permissionRepository, "pedagang.read"),
		sisaLapakController.CreateJalan,
	)

	app.Put("/api/petugas/sisa-lapak/:id",
		middleware.AuthMiddleware(cfg.JWTSecret),
		middleware.PermissionMiddleware(permissionRepository, "pedagang.read"),
		sisaLapakController.UpdateJalan,
	)

	app.Delete("/api/petugas/sisa-lapak/:id",
		middleware.AuthMiddleware(cfg.JWTSecret),
		middleware.PermissionMiddleware(permissionRepository, "pedagang.read"),
		sisaLapakController.DeleteJalan,
	)

	// ============================================================
	// 13. ENDPOINT PEDAGANG
	// ============================================================
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

	// 12a. Lapak (klaim nomor stand / "war")
	app.Get("/api/pedagang/lapak/kecamatan",
		middleware.AuthMiddleware(cfg.JWTSecret),
		middleware.RoleMiddleware(userRepository, "pedagang"),
		lapakController.ListKecamatan,
	)

	app.Get("/api/pedagang/lapak/jalan",
		middleware.AuthMiddleware(cfg.JWTSecret),
		middleware.RoleMiddleware(userRepository, "pedagang"),
		lapakController.ListJalan,
	)

	app.Post("/api/pedagang/lapak/klaim",
		middleware.AuthMiddleware(cfg.JWTSecret),
		middleware.RoleMiddleware(userRepository, "pedagang"),
		lapakController.ClaimLapak,
	)

	app.Get("/api/pedagang/lapak/status",
		middleware.AuthMiddleware(cfg.JWTSecret),
		middleware.RoleMiddleware(userRepository, "pedagang"),
		lapakController.GetStatus,
	)

	// ============================================================
	// 14. ENDPOINT SUPERADMIN (Manajemen User)
	// ============================================================

	// 14a. Pedagang
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

	app.Get("/api/admin/users/pedagang/:id",
		middleware.AuthMiddleware(cfg.JWTSecret),
		middleware.RoleMiddleware(userRepository, "superadmin"),
		pedagangController.GetPedagangByID,
	)

	app.Put("/api/admin/users/pedagang/:id",
		middleware.AuthMiddleware(cfg.JWTSecret),
		middleware.RoleMiddleware(userRepository, "superadmin"),
		pedagangController.UpdatePedagangByAdmin,
	)

	app.Delete("/api/admin/users/pedagang/:id",
		middleware.AuthMiddleware(cfg.JWTSecret),
		middleware.RoleMiddleware(userRepository, "superadmin"),
		pedagangController.DeletePedagangByAdmin,
	)

	// 14b. Petugas
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

	// 14c. Superadmin
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

	app.Delete("/api/admin/users/superadmin/:id",
		middleware.AuthMiddleware(cfg.JWTSecret),
		middleware.RoleMiddleware(userRepository, "superadmin"),
		userController.DeleteSuperadmin,
	)

	// 14d. Statistik
	app.Get("/api/admin/users/stats",
		middleware.AuthMiddleware(cfg.JWTSecret),
		middleware.RoleMiddleware(userRepository, "superadmin"),
		userController.GetUserStats,
	)

	// ============================================================
	// 15. BACKGROUND JOB: AUTO MULAI/SELESAI SESI CFD
	// ============================================================
	go func() {
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

	// ============================================================
	// 16. START SERVER
	// ============================================================
	log.Printf("server jalan di port %s", cfg.Port)
	if err := app.Listen(":" + cfg.Port); err != nil {
		log.Fatalf("server gagal jalan: %v", err)
	}
}