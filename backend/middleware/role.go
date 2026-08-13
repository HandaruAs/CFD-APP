package middleware

import (
	"net/http"

	"cfd-backend/modules/user/repository" 

	"github.com/gin-gonic/gin"
)


func RoleMiddleware(userRepo *repository.UserRepository, allowedRoles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		
		userID, exists := c.Get("user_id")
		if !exists {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "unauthorized - tidak ada user_id di context",
			})
			return
		}

		
		role, err := userRepo.GetUserRole(c.Request.Context(), userID.(string))
		if err != nil {
			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{
				"error": "gagal mengambil data role user",
			})
			return
		}

		
		for _, allowed := range allowedRoles {
			if role == allowed {
				c.Next()
				return
			}
		}

		
		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
			"error":          "anda tidak memiliki akses ke resource ini",
			"required_roles": allowedRoles,
			"your_role":      role,
		})
	}
}