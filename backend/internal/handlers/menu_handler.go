package handlers

import (
	"net/http"

	"cfd-backend/internal/repository"

	"github.com/gin-gonic/gin"
)

type MenuHandler struct {
	menuRepo     *repository.MenuRepository
	userRepo     *repository.UserRepository
	pedagangRepo *repository.PedagangRepository
}

func NewMenuHandler(menuRepo *repository.MenuRepository, userRepo *repository.UserRepository, pedagangRepo *repository.PedagangRepository) *MenuHandler {
	return &MenuHandler{menuRepo: menuRepo, userRepo: userRepo, pedagangRepo: pedagangRepo}
}

// GetMyMenus balikin menu (sudah tersusun jadi tree) yang boleh dilihat
// user yang lagi login, sesuai role dia di database saat ini -- bukan
// role yang tersimpan di token, jadi kalau role user diubah admin,
// menu-nya otomatis ikut berubah begitu dia refresh, tanpa perlu login ulang.
//
// Khusus role "pedagang", menu yang ditampilkan juga dibedain berdasarkan
// status verifikasi usaha dia: belum approved -> cuma menu Pendaftaran +
// Status Verifikasi; udah approved -> menu dashboard pedagang lengkap.
func (h *MenuHandler) GetMyMenus(c *gin.Context) {
	userID, _ := c.Get("user_id")

	roleSlug, err := h.userRepo.GetUserRole(c.Request.Context(), userID.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal mengambil role user"})
		return
	}

	var pedagangStage *string
	if roleSlug == "pedagang" {
		pengajuan, err := h.pedagangRepo.GetPengajuanByUserID(c.Request.Context(), userID.(string))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal mengambil status pedagang"})
			return
		}

		stage := "unverified"
		if pengajuan != nil && pengajuan.StatusVerifikasi == "approved" {
			stage = "verified"
		}
		pedagangStage = &stage
	}

	menus, err := h.menuRepo.GetMenusByRoleSlug(c.Request.Context(), roleSlug, pedagangStage)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal mengambil menu"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"menus": menus})
}