package middleware

import (
	"cfd-backend/modules/user/repository"

	"github.com/gofiber/fiber/v3"
)

func RoleMiddleware(userRepo *repository.UserRepository, allowedRoles ...string) fiber.Handler {
	return func(c fiber.Ctx) error {
		userID, exists := c.Locals("user_id").(string)
		if !exists || userID == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "unauthorized - tidak ada user_id di context",
			})
		}

		role, err := userRepo.GetUserRole(c.Context(), userID)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "gagal mengambil data role user",
			})
		}

		for _, allowed := range allowedRoles {
			if role == allowed {
				return c.Next()
			}
		}

		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error":          "anda tidak memiliki akses ke resource ini",
			"required_roles": allowedRoles,
			"your_role":      role,
		})
	}
}