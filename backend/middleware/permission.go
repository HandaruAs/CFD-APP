package middleware

import (
	"cfd-backend/modules/user/repository"

	"github.com/gofiber/fiber/v3"
)

func PermissionMiddleware(permRepo *repository.PermissionRepository, requiredPermission string) fiber.Handler {
	return func(c fiber.Ctx) error {
		userID, exists := c.Locals("user_id").(string)
		if !exists || userID == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "user tidak terautentikasi",
			})
		}

		hasPermission, err := permRepo.UserHasPermission(c.Context(), userID, requiredPermission)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "gagal memeriksa permission",
			})
		}

		if !hasPermission {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "tidak punya akses: " + requiredPermission,
			})
		}

		return c.Next()
	}
}