package controller

import (
	"errors"

	"cfd-backend/modules/petugas/acak-lapak/entity"
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
	case errors.Is(err, repository.ErrJalanTidakDitemukan):
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "jalan tidak ditemukan",
		})
	case errors.Is(err, repository.ErrKecamatanTidakDitemukan):
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "kecamatan tidak ditemukan",
		})
	case errors.Is(err, repository.ErrScopeTidakValid), errors.Is(err, usecase.ErrScopeTidakValid):
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "cakupan tidak valid",
		})
	case errors.Is(err, repository.ErrKecamatanWajibDiisi):
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "kecamatan_id wajib diisi untuk scope kecamatan",
		})
	case errors.Is(err, repository.ErrJalanWajibDiisi):
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "jalan_id wajib diisi untuk scope jalan",
		})
	case errors.Is(err, usecase.ErrWilayahTidakBerhak):
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "kamu tidak punya akses untuk generate slot di wilayah ini",
		})
	default:
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "gagal generate slot lapak: " + err.Error(),
		})
	}
}

// GenerateSlot - POST /api/petugas/acak-lapak/generate-slot
//
// Petugas nyiapin pool lokasi (lapak_slot) buat scope yang dipilih
// (kota/kecamatan/jalan), SEBELUM ada pedagang yang daftar. Idempotent --
// klik ulang gak over-provision, cuma nambahin kekurangannya aja.
func (ctrl *AcakLapakController) GenerateSlot(c fiber.Ctx) error {
	userID, exists := c.Locals("user_id").(string)
	if !exists || userID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	var req entity.GenerateSlotRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	if req.Scope == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "scope wajib diisi (kota, kecamatan, atau jalan)"})
	}

	result, err := ctrl.usecase.GenerateSlot(c.Context(), userID, &req)
	if err != nil {
		return mapAcakLapakError(c, err)
	}
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "pool lapak berhasil disiapkan",
		"data":    result,
	})
}