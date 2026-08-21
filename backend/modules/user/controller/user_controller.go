package controller

import (
	"cfd-backend/modules/user/entity"
	"cfd-backend/modules/user/usecase"

	"github.com/gofiber/fiber/v3"
)

type ListUsersResponse struct {
	Users []entity.UserManagementDTO `json:"users"`
	Total int                        `json:"total"`
}

type CreateUserByRoleRequest struct {
	Name     string `json:"name" validate:"required"`
	Email    string `json:"email" validate:"required,email"`
	Phone    string `json:"phone" validate:"required"`
	Password string `json:"password" validate:"required,min=8"`
}

type UserController struct {
	userUsecase usecase.UserUsecase
}

func NewUserController(userUsecase usecase.UserUsecase) *UserController {
	return &UserController{userUsecase: userUsecase}
}

// Me adalah handler untuk GET /api/me
func (ctrl *UserController) Me(c fiber.Ctx) error {
	userID, exists := c.Locals("user_id").(string)
	if !exists || userID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "User ID tidak ditemukan di token",
		})
	}

	userProfile, err := ctrl.userUsecase.GetUserProfile(c.Context(), userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Gagal mengambil data user: " + err.Error(),
		})
	}

	role, err := ctrl.userUsecase.GetUserRole(c.Context(), userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Gagal mengambil role user: " + err.Error(),
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"user": fiber.Map{
			"id":     userProfile.ID,
			"name":   userProfile.Name,
			"email":  userProfile.Email,
			"status": userProfile.Status,
			"role":   role,
		},
	})
}

// GetUserStats handler untuk GET /api/admin/users/stats?role=...
func (ctrl *UserController) GetUserStats(c fiber.Ctx) error {
	roleSlug := c.Query("role")
	if roleSlug == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Parameter 'role' wajib diisi",
		})
	}

	stats, err := ctrl.userUsecase.GetUserStatsByRole(c.Context(), roleSlug)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Gagal mengambil statistik",
		})
	}

	return c.Status(fiber.StatusOK).JSON(stats)
}

// ListUsersByRole handler untuk GET /api/admin/users/pedagang dan /api/admin/users/petugas
func (ctrl *UserController) ListUsersByRole(c fiber.Ctx) error {
	roleSlug := c.Query("role")
	if roleSlug == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Parameter 'role' wajib diisi",
		})
	}
	search := c.Query("search")

	users, total, err := ctrl.userUsecase.ListUsersByRole(c.Context(), roleSlug, search)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Gagal mengambil data user",
		})
	}

	return c.Status(fiber.StatusOK).JSON(ListUsersResponse{
		Users: users,
		Total: total,
	})
}

// CreateUserByRole handler untuk POST /api/admin/users/pedagang dan /api/admin/users/petugas
func (ctrl *UserController) CreateUserByRole(c fiber.Ctx) error {
	roleSlug := c.Query("role")
	if roleSlug == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Parameter 'role' wajib diisi",
		})
	}

	var req CreateUserByRoleRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	userID, err := ctrl.userUsecase.CreateUserByRole(
		c.Context(),
		req.Name, req.Email, req.Phone, req.Password, roleSlug,
	)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Gagal membuat user: " + err.Error(),
		})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message": "User berhasil ditambahkan",
		"user_id": userID,
	})
}

type UpdateUserBasicRequest struct {
	Name  string `json:"name" validate:"required"`
	Phone string `json:"phone" validate:"required"`
}

// GetUserByID handler untuk GET /api/admin/users/petugas/:id
func (ctrl *UserController) GetUserByID(c fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "ID tidak boleh kosong",
		})
	}

	user, err := ctrl.userUsecase.GetUserProfile(c.Context(), id)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "User tidak ditemukan",
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"id":    user.ID,
		"name":  user.Name,
		"email": user.Email,
		"phone": user.Phone,
	})
}

// UpdateUserByRole handler untuk PUT /api/admin/users/petugas/:id
func (ctrl *UserController) UpdateUserByRole(c fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "ID tidak boleh kosong",
		})
	}

	var req UpdateUserBasicRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	if err := ctrl.userUsecase.UpdateUserBasic(c.Context(), id, req.Name, req.Phone); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Gagal menyimpan perubahan",
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "Data berhasil diperbarui",
	})
}

// DeleteUserByRole handler untuk DELETE /api/admin/users/petugas/:id
func (ctrl *UserController) DeleteUserByRole(c fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "ID tidak boleh kosong",
		})
	}

	if err := ctrl.userUsecase.DeleteUser(c.Context(), id); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Gagal menghapus data",
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "Petugas berhasil dihapus",
	})
}