package controller

import (
	"net/http"
	"cfd-backend/modules/menu/usecase"
	"github.com/gin-gonic/gin"
)

type MenuController struct {
	menuUsecase usecase.MenuUsecase
}

func NewMenuController(menuUsecase usecase.MenuUsecase) *MenuController {
	return &MenuController{menuUsecase: menuUsecase}
}

// GetMyMenus adalah handler untuk GET /api/menus
// Mengembalikan menu tree (berelasi parent-child) sesuai role user
func (ctrl *MenuController) GetMyMenus(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User ID tidak ditemukan di token"})
		return
	}

	menus, err := ctrl.menuUsecase.GetMyMenus(c.Request.Context(), userID.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil menu: " + err.Error()})
		return
	}

	// Response langsung berupa list menu tree (Array JSON)
	c.JSON(http.StatusOK, menus)
}