package controller

import (
	"errors"
	"log"

	"cfd-backend/modules/admin/laporan/usecase"

	"github.com/gofiber/fiber/v3"
)

type LaporanController struct {
	usecase usecase.LaporanUsecase
}

func NewLaporanController(uc usecase.LaporanUsecase) *LaporanController {
	return &LaporanController{usecase: uc}
}

// GetLaporan - GET /api/admin/laporan?startDate=2026-09-01&endDate=2026-09-28
// Kosongkan tanggal untuk 30 hari terakhir.
func (ctrl *LaporanController) GetLaporan(c fiber.Ctx) error {
	data, err := ctrl.usecase.GetLaporan(c.Context(), c.Query("startDate"), c.Query("endDate"))
	if err != nil {
		if errors.Is(err, usecase.ErrTanggalTidakValid) ||
			errors.Is(err, usecase.ErrRentangTerbalik) ||
			errors.Is(err, usecase.ErrRentangTerlaluPanjang) {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
		}
		log.Println("[admin-laporan] GetLaporan error:", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "gagal memuat laporan",
		})
	}
	return c.Status(fiber.StatusOK).JSON(data)
}