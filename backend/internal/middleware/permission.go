package middleware

import (
	"net/http"

	"cfd-backend/internal/repository"

	"github.com/gin-gonic/gin"
)

// PermissionMiddleware HARUS dipasang setelah AuthMiddleware di chain-nya,
// karena dia butuh "user_id" yang disimpan AuthMiddleware di context.
// Contoh pemakaian di route:
//
//	router.GET("/api/users",
//	    middleware.AuthMiddleware(cfg.JWTSecret),
//	    middleware.PermissionMiddleware(permRepo, "users.read"),
//	    userHandler.Index,
//	)
func PermissionMiddleware(permRepo *repository.PermissionRepository, requiredPermission string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("user_id")
		if !exists {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "user tidak terautentikasi"})
			return
		}

		hasPermission, err := permRepo.UserHasPermission(c.Request.Context(), userID.(string), requiredPermission)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "gagal memeriksa permission"})
			return
		}

		if !hasPermission {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "tidak punya akses: " + requiredPermission})
			return
		}

		c.Next()
	}
}