package controller

import (
	"errors"

	"cfd-backend/modules/pedagang/checkout/entity"
	"cfd-backend/modules/pedagang/checkout/repository"
	"cfd-backend/modules/pedagang/checkout/usecase"

	"github.com/gofiber/fiber/v3"
)

type CheckoutController struct {
	usecase usecase.CheckoutUsecase
}

func NewCheckoutController(usecase usecase.CheckoutUsecase) *CheckoutController {
	return &CheckoutController{usecase: usecase}
}

// GetDataCheckout - GET /api/pedagang/checkout
// Dipanggil pas halaman "Cek-out Pedagang" mount, buat ngisi semua field
// read-only (kecamatan, jalan, nomor stan, data diri, data usaha).
func (ctrl *CheckoutController) GetDataCheckout(c fiber.Ctx) error {
	userID, exists := c.Locals("user_id").(string)
	if !exists || userID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "User tidak terautentikasi",
		})
	}

	data, err := ctrl.usecase.GetDataCheckout(c.Context(), userID)
	if err != nil {
		switch {
		case errors.Is(err, repository.ErrPedagangTidakDitemukan):
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": err.Error()})
		case errors.Is(err, repository.ErrTidakAdaSesiAktif):
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": err.Error()})
		case errors.Is(err, repository.ErrSesiBelumSelesai):
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": err.Error()})
		default:
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "gagal mengambil data checkout",
			})
		}
	}

	return c.Status(fiber.StatusOK).JSON(data)
}

// SubmitCheckout - POST /api/pedagang/checkout
// Body: { "omset": 500000 }
func (ctrl *CheckoutController) SubmitCheckout(c fiber.Ctx) error {
	userID, exists := c.Locals("user_id").(string)
	if !exists || userID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "User tidak terautentikasi",
		})
	}

	var req entity.SubmitCheckoutRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	if req.Omset <= 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "omset wajib diisi dan harus lebih dari 0",
		})
	}

	result, err := ctrl.usecase.SubmitCheckout(c.Context(), userID, req.Omset)
	if err != nil {
		switch {
		case errors.Is(err, repository.ErrPedagangTidakDitemukan):
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": err.Error()})
		case errors.Is(err, repository.ErrTidakAdaSesiAktif):
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": err.Error()})
		case errors.Is(err, repository.ErrSesiBelumSelesai):
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": err.Error()})
		case errors.Is(err, repository.ErrBelumCheckIn):
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": err.Error()})
		case errors.Is(err, repository.ErrSudahCheckOut):
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": err.Error()})
		default:
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "gagal menyimpan cek-out",
			})
		}
	}

	return c.Status(fiber.StatusOK).JSON(result)
}