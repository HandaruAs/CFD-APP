package controller

import (
	"cfd-backend/modules/menu/usecase"

	"github.com/gofiber/fiber/v3"
)

type MenuController struct {
	menuUsecase usecase.MenuUsecase
}

func NewMenuController(menuUsecase usecase.MenuUsecase) *MenuController {
	return &MenuController{menuUsecase: menuUsecase}
}

// GetMyMenus adalah handler untuk GET /api/menus
// Mengembalikan menu tree (berelasi parent-child) sesuai role user
func (ctrl *MenuController) GetMyMenus(c fiber.Ctx) error {
	userID, exists := c.Locals("user_id").(string)
	if !exists || userID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "User ID tidak ditemukan di token",
		})
	}

	menus, err := ctrl.menuUsecase.GetMyMenus(c.Context(), userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Gagal mengambil menu: " + err.Error(),
		})
	}

	// Response langsung berupa list menu tree (Array JSON)
	return c.Status(fiber.StatusOK).JSON(menus)
}