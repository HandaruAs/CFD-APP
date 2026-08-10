package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// CORSMiddleware mengizinkan frontend (Next.js web, dan nanti domain
// production) untuk memanggil API ini dari origin yang berbeda.
// allowedOrigins diisi dari env CORS_ALLOWED_ORIGINS, dipisah koma,
// contoh: "http://localhost:3000,https://cfd.kota.go.id"
//
// Sengaja ditulis manual (tanpa gin-contrib/cors) biar tidak nambah
// dependency baru di go.mod/go.sum.
func CORSMiddleware(allowedOrigins []string) gin.HandlerFunc {
	originSet := make(map[string]bool, len(allowedOrigins))
	for _, o := range allowedOrigins {
		originSet[strings.TrimSpace(o)] = true
	}

	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")

		if origin != "" && originSet[origin] {
			c.Header("Access-Control-Allow-Origin", origin)
			c.Header("Vary", "Origin")
			c.Header("Access-Control-Allow-Credentials", "true")
			c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
			c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Authorization")
		}

		// Preflight request browser selalu pakai method OPTIONS,
		// cukup dibalas 204 tanpa lanjut ke handler asli.
		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}