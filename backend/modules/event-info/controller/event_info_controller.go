package controller

import (
	"errors"
	"log"

	"cfd-backend/modules/event-info/usecase"

	"github.com/gofiber/fiber/v3"
)

type EventInfoController struct {
	usecase usecase.EventInfoUsecase
}

func NewEventInfoController(uc usecase.EventInfoUsecase) *EventInfoController {
	return &EventInfoController{usecase: uc}
}

// ListPublik - GET /api/public/sisa-lapak (tanpa login)
// Event hari ini & 14 hari ke depan: jam, kuota, sisa, dan sebaran lokasi.
func (ctrl *EventInfoController) ListPublik(c fiber.Ctx) error {
	list, err := ctrl.usecase.ListPublik(c.Context())
	if err != nil {
		log.Println("[event-info] ListPublik error:", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "gagal memuat data sisa lapak"})
	}
	return c.JSON(fiber.Map{"data": list})
}

// ListHariIni - GET /api/petugas/events/hari-ini
// Semua event hari ini untuk dashboard petugas.
func (ctrl *EventInfoController) ListHariIni(c fiber.Ctx) error {
	list, err := ctrl.usecase.ListHariIni(c.Context())
	if err != nil {
		log.Println("[event-info] ListHariIni error:", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "gagal memuat event hari ini"})
	}
	return c.JSON(fiber.Map{"data": list})
}

// ListPilihan - GET /api/petugas/events?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
// Daftar event di rentang tanggal untuk dropdown filter laporan petugas.
func (ctrl *EventInfoController) ListPilihan(c fiber.Ctx) error {
	list, err := ctrl.usecase.ListPilihan(c.Context(), c.Query("startDate"), c.Query("endDate"))
	if err != nil {
		if errors.Is(err, usecase.ErrTanggalTidakValid) {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
		}
		log.Println("[event-info] ListPilihan error:", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "gagal memuat daftar event"})
	}
	return c.JSON(fiber.Map{"data": list})
}