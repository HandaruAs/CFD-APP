package middleware

import (
	"net/http"

	"cfd-backend/internal/repository"

	"github.com/gin-gonic/gin"
)

// RoleMiddleware cek apakah user memiliki salah satu role yang diizinkan
// Contoh penggunaan:
//   RoleMiddleware(userRepo, "superadmin", "petugas_cfd")
func RoleMiddleware(userRepo *repository.UserRepository, allowedRoles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Ambil user_id dari context (sudah di-set oleh AuthMiddleware)
		userID, exists := c.Get("user_id")
		if !exists {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "unauthorized - tidak ada user_id di context",
			})
			return
		}

		// Ambil roles user dari database
		roles, err := userRepo.GetUserRoles(c.Request.Context(), userID.(string))
		if err != nil {
			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{
				"error": "gagal mengambil data role user",
			})
			return
		}

		// Cek apakah user memiliki salah satu role yang diizinkan
		for _, allowed := range allowedRoles {
			for _, role := range roles {
				if role == allowed {
					// User punya akses, lanjutkan ke handler berikutnya
					c.Next()
					return
				}
			}
		}

		// User tidak punya role yang diizinkan
		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
			"error": "anda tidak memiliki akses ke resource ini",
			"required_roles": allowedRoles,
			"your_roles":     roles,
		})
	}
}