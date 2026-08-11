package middleware

import (
	"net/http"

	"cfd-backend/internal/repository"

	"github.com/gin-gonic/gin"
)

// RoleMiddleware cek apakah user memiliki salah satu role yang diizinkan
// Contoh penggunaan:
//   RoleMiddleware(userRepo, "superadmin", "petugas")
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

		// Ambil role user dari database (desain saat ini: 1 user = 1 role)
		role, err := userRepo.GetUserRole(c.Request.Context(), userID.(string))
		if err != nil {
			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{
				"error": "gagal mengambil data role user",
			})
			return
		}

		// Cek apakah role user termasuk yang diizinkan
		for _, allowed := range allowedRoles {
			if role == allowed {
				// User punya akses, lanjutkan ke handler berikutnya
				c.Next()
				return
			}
		}

		// User tidak punya role yang diizinkan
		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
			"error":          "anda tidak memiliki akses ke resource ini",
			"required_roles": allowedRoles,
			"your_role":      role,
		})
	}
}