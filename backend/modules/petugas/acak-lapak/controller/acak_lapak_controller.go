package controller

import (
	"errors"

	"cfd-backend/modules/petugas/acak-lapak/repository"
	"cfd-backend/modules/petugas/acak-lapak/usecase"

	"github.com/gofiber/fiber/v3"
)

type AcakLapakController struct {
	usecase usecase.AcakLapakUsecase
}

func NewAcakLapakController(usecase usecase.AcakLapakUsecase) *AcakLapakController {
	return &AcakLapakController{usecase: usecase}
}

func mapAcakLapakError(c fiber.Ctx, err error) error {
	switch {
	case errors.Is(err, repository.ErrTidakAdaSesiAktif):
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{
			"error": "belum ada sesi CFD yang aktif hari ini",
		})
	case errors.Is(err, repository.ErrJalanTidakDitemukan):
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "jalan tidak ditemukan",
		})
	case errors.Is(err, repository.ErrKecamatanTidakDitemukan):
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "kecamatan tidak ditemukan",
		})
	default:
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "gagal mengacak lapak: " + err.Error(),
		})
	}
}

// AcakJalan - POST /api/petugas/acak-lapak/jalan/:jalanId
func (ctrl *AcakLapakController) AcakJalan(c fiber.Ctx) error {
	jalanID := c.Params("jalanId")
	if jalanID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "jalanId wajib diisi"})
	}

	result, err := ctrl.usecase.AcakJalan(c.Context(), jalanID)
	if err != nil {
		return mapAcakLapakError(c, err)
	}
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "nomor lapak berhasil diacak",
		"data":    result,
	})
}

// AcakKecamatan - POST /api/petugas/acak-lapak/kecamatan/:kecamatanId
func (ctrl *AcakLapakController) AcakKecamatan(c fiber.Ctx) error {
	kecamatanID := c.Params("kecamatanId")
	if kecamatanID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "kecamatanId wajib diisi"})
	}

	result, err := ctrl.usecase.AcakKecamatan(c.Context(), kecamatanID)
	if err != nil {
		return mapAcakLapakError(c, err)
	}
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "nomor lapak se-kecamatan berhasil diacak",
		"data":    result,
	})
}

// AcakSemua - POST /api/petugas/acak-lapak/semua
func (ctrl *AcakLapakController) AcakSemua(c fiber.Ctx) error {
	result, err := ctrl.usecase.AcakSemua(c.Context())
	if err != nil {
		return mapAcakLapakError(c, err)
	}
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "nomor lapak se-Surabaya berhasil diacak",
		"data":    result,
	})
}
