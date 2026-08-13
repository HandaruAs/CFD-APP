package controller

import (
	"net/http"

	"cfd-backend/modules/user/usecase"

	"github.com/gin-gonic/gin"
)

type UserController struct {
	userUsecase usecase.UserUsecase
}

func NewUserController(userUsecase usecase.UserUsecase) *UserController {
	return &UserController{userUsecase: userUsecase}
}

// Me adalah handler untuk GET /api/me
func (ctrl *UserController) Me(c *gin.Context) {
	// Ambil user_id dari context yang sudah diset oleh AuthMiddleware
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User ID tidak ditemukan di token"})
		return
	}

	// Ambil data user dari usecase
	userProfile, err := ctrl.userUsecase.GetUserProfile(c.Request.Context(), userID.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data user: " + err.Error()})
		return
	}

	// Ambil role user dari usecase
	role, err := ctrl.userUsecase.GetUserRole(c.Request.Context(), userID.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil role user: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"user": gin.H{
			"id":     userProfile.ID,
			"name":   userProfile.Name,
			"email":  userProfile.Email,
			"status": userProfile.Status,
			"role":   role,
		},
	})
}