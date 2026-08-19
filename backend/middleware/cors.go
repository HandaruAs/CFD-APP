package middleware

import (
	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/cors"
)

// CORSMiddleware mengembalikan konfigurasi CORS untuk Fiber
// Catatan: Di Fiber, CORS di-set sebagai middleware terpisah,
// bukan custom handler seperti di Gin.
func CORSMiddleware(allowedOrigins []string) fiber.Handler {
	return cors.New(cors.Config{
		AllowOrigins:     allowedOrigins,
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		AllowCredentials: true,
	})
}