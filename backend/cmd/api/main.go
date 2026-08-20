package main

import (
	"log"

	"cfd-backend/config"
	"cfd-backend/database"
	"cfd-backend/middleware"

	// Modul Repository
	userRepo "cfd-backend/modules/user/repository"
	pedagangRepo "cfd-backend/modules/pedagang/repository"
	menuRepo "cfd-backend/modules/menu/repository"
	permRepo "cfd-backend/modules/user/repository"
	operasionalRepo "cfd-backend/modules/operasional/repository"

	// Modul Usecase
	authUsecase "cfd-backend/modules/auth/usecase"
	userUsecase "cfd-backend/modules/user/usecase"
	pedagangUsecase "cfd-backend/modules/pedagang/usecase"
	menuUsecase "cfd-backend/modules/menu/usecase"
	operasionalUsecase "cfd-backend/modules/operasional/usecase"

	// Modul Controller
	authController "cfd-backend/modules/auth/controller"
	userController "cfd-backend/modules/user/controller"
	pedagangController "cfd-backend/modules/pedagang/controller"
	menuController "cfd-backend/modules/menu/controller"
	operasionalController "cfd-backend/modules/operasional/controller"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/cors"
	"github.com/gofiber/fiber/v3/middleware/logger"
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

	// 2. Init All Usecases
	authUsecase := authUsecase.NewAuthUsecase(userRepository, cfg.JWTSecret)
	userUsecase := userUsecase.NewUserUsecase(userRepository)
	pedagangUsecase := pedagangUsecase.NewPedagangUsecase(pedagangRepository)
	menuUsecase := menuUsecase.NewMenuUsecase(menuRepository, userRepository, pedagangRepository)
	operasionalUsecase := operasionalUsecase.NewOperasionalUsecase(operasionalRepository)

	// 3. Init All Controllers
	authController := authController.NewAuthController(authUsecase)
	userController := userController.NewUserController(userUsecase)
	pedagangController := pedagangController.NewPedagangController(pedagangUsecase, userUsecase)
	menuController := menuController.NewMenuController(menuUsecase)
	operasionalController := operasionalController.NewOperasionalController(operasionalUsecase)

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

	log.Printf("server jalan di port %s", cfg.Port)
	if err := app.Listen(":" + cfg.Port); err != nil {
		log.Fatalf("server gagal jalan: %v", err)
	}
}