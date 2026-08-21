package controller

import (
	"errors"

	"cfd-backend/modules/menu/entity"
	"cfd-backend/modules/menu/usecase"

	"github.com/gofiber/fiber/v3"
)

// MenuFormRequest -- body buat POST/PUT menu. RoleSlugs itu REPLACE
// penuh assignment role (dipakai apa adanya oleh usecase.UpdateMenu).
type MenuFormRequest struct {
	Name      string   `json:"name" validate:"required"`
	Slug      string   `json:"slug" validate:"required"`
	Icon      *string  `json:"icon"`
	Route     *string  `json:"route"`
	ParentID  *string  `json:"parent_id"`
	SortOrder int      `json:"sort_order"`
	RoleSlugs []string `json:"role_slugs" validate:"required"`
}

func (req MenuFormRequest) toInput() entity.MenuInput {
	return entity.MenuInput{
		Name:      req.Name,
		Slug:      req.Slug,
		Icon:      req.Icon,
		Route:     req.Route,
		ParentID:  req.ParentID,
		SortOrder: req.SortOrder,
		RoleSlugs: req.RoleSlugs,
	}
}

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

// -- Menu management (superadmin only, di-guard lewat RoleMiddleware di main.go) --

// ListAllMenus handler untuk GET /api/admin/menus
func (ctrl *MenuController) ListAllMenus(c fiber.Ctx) error {
	menus, err := ctrl.menuUsecase.ListAllMenus(c.Context())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Gagal mengambil data menu: " + err.Error(),
		})
	}
	return c.Status(fiber.StatusOK).JSON(menus)
}

// ListRoles handler untuk GET /api/admin/roles (isi checkbox role-picker)
func (ctrl *MenuController) ListRoles(c fiber.Ctx) error {
	roles, err := ctrl.menuUsecase.ListRoles(c.Context())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Gagal mengambil data role: " + err.Error(),
		})
	}
	return c.Status(fiber.StatusOK).JSON(roles)
}

// CreateMenu handler untuk POST /api/admin/menus
func (ctrl *MenuController) CreateMenu(c fiber.Ctx) error {
	var req MenuFormRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	id, err := ctrl.menuUsecase.CreateMenu(c.Context(), req.toInput())
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message": "Menu berhasil dibuat",
		"id":      id,
	})
}

// UpdateMenu handler untuk PUT /api/admin/menus/:id
func (ctrl *MenuController) UpdateMenu(c fiber.Ctx) error {
	id := c.Params("id")

	var req MenuFormRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	if err := ctrl.menuUsecase.UpdateMenu(c.Context(), id, req.toInput()); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "Menu berhasil diupdate",
	})
}

// DeleteMenu handler untuk DELETE /api/admin/menus/:id
func (ctrl *MenuController) DeleteMenu(c fiber.Ctx) error {
	id := c.Params("id")

	if err := ctrl.menuUsecase.DeleteMenu(c.Context(), id); err != nil {
		if errors.Is(err, entity.ErrMenuHasChildren) {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": err.Error(),
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Gagal menghapus menu: " + err.Error(),
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "Menu berhasil dihapus",
	})
}