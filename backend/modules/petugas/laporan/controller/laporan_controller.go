package controller

import (
	"errors"
	"strconv"

	"cfd-backend/modules/petugas/laporan/entity"
	"cfd-backend/modules/petugas/laporan/usecase"
	"github.com/gofiber/fiber/v3"
)

type LaporanController struct {
	laporanUsecase usecase.LaporanUsecase
}

func NewLaporanController(laporanUsecase usecase.LaporanUsecase) *LaporanController {
	return &LaporanController{laporanUsecase: laporanUsecase}
}

// GetLaporan - GET /api/petugas/laporan
func (c *LaporanController) GetLaporan(ctx fiber.Ctx) error {
	startDate := ctx.Query("startDate", "")
	endDate := ctx.Query("endDate", "")
	search := ctx.Query("search", "")
	page, _ := strconv.Atoi(ctx.Query("page", "1"))
	limit, _ := strconv.Atoi(ctx.Query("limit", "20"))

	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 20
	}

	req := &entity.LaporanRequest{
		StartDate: startDate,
		EndDate:   endDate,
		Search:    search,
		Page:      page,
		Limit:     limit,
	}

	resp, err := c.laporanUsecase.GetLaporan(ctx.Context(), req)
	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "gagal mengambil data laporan: " + err.Error(),
		})
	}

	return ctx.Status(fiber.StatusOK).JSON(resp)
}

// GetStats - GET /api/petugas/laporan/stats
func (c *LaporanController) GetStats(ctx fiber.Ctx) error {
	startDate := ctx.Query("startDate", "")
	endDate := ctx.Query("endDate", "")

	resp, err := c.laporanUsecase.GetStatsKehadiran(ctx.Context(), startDate, endDate)
	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "gagal mengambil statistik: " + err.Error(),
		})
	}

	return ctx.Status(fiber.StatusOK).JSON(resp)
}

// GetDetail - GET /api/petugas/laporan/:id
// Detail 1 baris kehadiran (NIK & email pedagang sudah disensor).
func (c *LaporanController) GetDetail(ctx fiber.Ctx) error {
	id := ctx.Params("id")
	if id == "" {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "id kehadiran wajib diisi",
		})
	}

	resp, err := c.laporanUsecase.GetDetailKehadiran(ctx.Context(), id)
	if err != nil {
		if errors.Is(err, usecase.ErrKehadiranTidakDitemukan) {
			return ctx.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": err.Error(),
			})
		}
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "gagal mengambil detail kehadiran: " + err.Error(),
		})
	}

	return ctx.Status(fiber.StatusOK).JSON(resp)
}