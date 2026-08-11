package handlers

import (
	"net/http"

	"cfd-backend/internal/repository"

	"github.com/gin-gonic/gin"
)

type MenuHandler struct {
	menuRepo *repository.MenuRepository
	userRepo *repository.UserRepository
}

func NewMenuHandler(menuRepo *repository.MenuRepository, userRepo *repository.UserRepository) *MenuHandler {
	return &MenuHandler{menuRepo: menuRepo, userRepo: userRepo}
}

// GetMyMenus balikin menu (sudah tersusun jadi tree) yang boleh dilihat
// user yang lagi login, sesuai role dia di database saat ini -- bukan
// role yang tersimpan di token, jadi kalau role user diubah admin,
// menu-nya otomatis ikut berubah begitu dia refresh, tanpa perlu login ulang.
func (h *MenuHandler) GetMyMenus(c *gin.Context) {
	userID, _ := c.Get("user_id")

	roleSlug, err := h.userRepo.GetUserRole(c.Request.Context(), userID.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal mengambil role user"})
		return
	}

	menus, err := h.menuRepo.GetMenusByRoleSlug(c.Request.Context(), roleSlug)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal mengambil menu"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"menus": menus})
}