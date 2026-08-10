package middleware

import (
	"net/http"
	"strings"

	"cfd-backend/internal/auth"

	"github.com/gin-gonic/gin"
)

// AuthMiddleware memvalidasi token JWT yang dikirim lewat header:
// Authorization: Bearer <token>
// Kalau valid, user_id disimpan di context biar bisa dipakai handler
// atau middleware selanjutnya (misal PermissionMiddleware).
func AuthMiddleware(jwtSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if header == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "token tidak ditemukan"})
			return
		}

		parts := strings.SplitN(header, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "format token salah, harus 'Bearer <token>'"})
			return
		}

		claims, err := auth.ParseToken(parts[1], jwtSecret)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "token tidak valid atau kadaluarsa"})
			return
		}

		c.Set("user_id", claims.UserID)
		c.Next()
	}
}