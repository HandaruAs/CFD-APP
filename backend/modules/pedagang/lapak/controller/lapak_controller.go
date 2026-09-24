package controller

import (
	"errors"

	"cfd-backend/modules/pedagang/lapak/repository"
	"cfd-backend/modules/pedagang/lapak/usecase"

	"github.com/gofiber/fiber/v3"
)

type LapakController struct {
	usecase usecase.LapakUsecase
}

func NewLapakController(usecase usecase.LapakUsecase) *LapakController {
	return &LapakController{usecase: usecase}
}

func (ctrl *LapakController) ListKecamatan(c fiber.Ctx) error {
	list, err := ctrl.usecase.ListKecamatan(c.Context())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "gagal mengambil daftar kecamatan",
		})
	}
	return c.Status(fiber.StatusOK).JSON(fiber.Map{"kecamatan": list})
}

func (ctrl *LapakController) ListJalan(c fiber.Ctx) error {
	kecamatanID := c.Query("kecamatan_id")
	if kecamatanID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "kecamatan_id wajib diisi",
		})
	}

	list, err := ctrl.usecase.ListJalan(c.Context(), kecamatanID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "gagal mengambil daftar jalan",
		})
	}
	return c.Status(fiber.StatusOK).JSON(fiber.Map{"jalan": list})
}

// ClaimLapak - POST /api/pedagang/lapak/klaim
//
// Gak ada request body sama sekali sekarang -- jalan & nomor lapaknya
// diambil dari pool yang udah disiapin petugas (lihat
// modules/petugas/acak-lapak GenerateSlot), bukan dipilih/diacak di sini.
func (ctrl *LapakController) ClaimLapak(c fiber.Ctx) error {
	userID, exists := c.Locals("user_id").(string)
	if !exists || userID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "User tidak terautentikasi",
		})
	}

	result, err := ctrl.usecase.ClaimLapak(c.Context(), userID)
	if err != nil {
		switch {
		case errors.Is(err, repository.ErrLapakBelumDiacak):
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "lapak belum diacak petugas, silakan coba lagi nanti"})
		case errors.Is(err, repository.ErrBelumCheckout):
			// Kode khusus biar frontend bisa langsung arahin ke checkout,
			// sama kayak BELUM_CHECKOUT di /api/petugas/check-in.
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{
				"error": err.Error(),
				"code":  "BELUM_CHECKOUT",
			})
		case errors.Is(err, repository.ErrSudahKlaim):
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "kamu sudah klaim lapak di sesi ini"})
		case errors.Is(err, repository.ErrPedagangTidakDitemukan):
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "profil pedagang tidak ditemukan"})
		default:
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "gagal klaim lapak"})
		}
	}

	return c.Status(fiber.StatusCreated).JSON(result)
}

func (ctrl *LapakController) GetStatus(c fiber.Ctx) error {
	userID, exists := c.Locals("user_id").(string)
	if !exists || userID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "User tidak terautentikasi"})
	}

	status, err := ctrl.usecase.GetStatus(c.Context(), userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "gagal mengambil status"})
	}

	return c.Status(fiber.StatusOK).JSON(status)
}