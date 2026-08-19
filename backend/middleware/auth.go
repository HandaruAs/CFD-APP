package middleware

import (
	"strings"

	"cfd-backend/pkg/auth"

	"github.com/gofiber/fiber/v3"
)

func AuthMiddleware(jwtSecret string) fiber.Handler {
	return func(c fiber.Ctx) error {
		// Ambil token dari header Authorization
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "authorization header required",
			})
		}

		// Format: Bearer <token>
		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "invalid authorization format, use Bearer <token>",
			})
		}

		tokenString := parts[1]

		// Validasi token
		userID, err := auth.ValidateToken(tokenString, jwtSecret)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "invalid or expired token",
			})
		}

		// Simpan user_id di locals untuk digunakan handler selanjutnya
		c.Locals("user_id", userID)
		return c.Next()
	}
}