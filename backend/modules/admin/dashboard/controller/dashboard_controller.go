package controller

import (
	"log"

	"cfd-backend/modules/admin/dashboard/usecase"

	"github.com/gofiber/fiber/v3"
)

type DashboardController struct {
	usecase usecase.DashboardUsecase
}

func NewDashboardController(uc usecase.DashboardUsecase) *DashboardController {
	return &DashboardController{usecase: uc}
}

// GetDashboard - GET /api/admin/dashboard
func (ctrl *DashboardController) GetDashboard(c fiber.Ctx) error {
	data, err := ctrl.usecase.GetDashboard(c.Context())
	if err != nil {
		log.Println("[admin-dashboard] GetDashboard error:", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "gagal memuat data dashboard",
		})
	}
	return c.Status(fiber.StatusOK).JSON(data)
}