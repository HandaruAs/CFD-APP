package controller

import (
	"errors"
	"net/http"

	"cfd-backend/modules/pedagang/entity"
	"cfd-backend/modules/pedagang/usecase"
	userUC "cfd-backend/modules/user/usecase"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgconn"
)

type CreatePedagangByAdminRequest struct {
	Name         string `json:"name" binding:"required"`
	Email        string `json:"email" binding:"required,email"`
	Phone        string `json:"phone" binding:"required"`
	Password     string `json:"password" binding:"required,min=8"`
	NIK          string `json:"nik" binding:"required,len=16"`
	NamaUsaha    string `json:"nama_usaha" binding:"required"`
	JenisDagangan string `json:"jenis_dagangan" binding:"required"`
	PerkiraanHarga string `json:"perkiraan_harga" binding:"required"`
	Alamat       string `json:"alamat" binding:"required"`
}

type PedagangController struct {
	pedagangUsecase usecase.PedagangUsecase
	userUsecase     userUC.UserUsecase
}

func NewPedagangController(
	pedagangUsecase usecase.PedagangUsecase,
	userUsecase userUC.UserUsecase,
) *PedagangController {
	return &PedagangController{
		pedagangUsecase: pedagangUsecase,
		userUsecase:     userUsecase,
	}
}

func (ctrl *PedagangController) AjukanUsaha(c *gin.Context) {
	var req entity.PengajuanUsahaRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User tidak terautentikasi"})
		return
	}

	pengajuanID, err := ctrl.pedagangUsecase.AjukanUsaha(c.Request.Context(), userID.(string), &req)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			if pgErr.ConstraintName == "pedagang_profiles_user_id_key" {
				c.JSON(http.StatusConflict, gin.H{"error": "kamu sudah pernah mengajukan usaha sebelumnya"})
				return
			}
			c.JSON(http.StatusConflict, gin.H{"error": "NIK sudah terdaftar"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal menyimpan pengajuan"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message":      "pengajuan usaha berhasil dikirim, menunggu verifikasi petugas",
		"pengajuan_id": pengajuanID,
	})
}

func (ctrl *PedagangController) StatusPengajuan(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User tidak terautentikasi"})
		return
	}

	pengajuan, err := ctrl.pedagangUsecase.StatusPengajuan(c.Request.Context(), userID.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal mengambil data pengajuan"})
		return
	}

	if pengajuan == nil {
		c.JSON(http.StatusOK, gin.H{"has_pengajuan": false})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"has_pengajuan":  true,
		"id":             pengajuan.ID,
		"nik":            pengajuan.NIK,
		"nama_usaha":     pengajuan.NamaUsaha,
		"jenis_dagangan": pengajuan.JenisDagangan,
		"perkiraan_harga": pengajuan.PerkiraanHarga,
		"alamat":         pengajuan.Alamat,
		"status":         pengajuan.StatusVerifikasi,
		"catatan":        pengajuan.Catatan,
	})
}

func (ctrl *PedagangController) CreatePedagangByAdmin(c *gin.Context) {
	var req CreatePedagangByAdminRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID, err := ctrl.userUsecase.RegisterPedagangByAdmin(
		c.Request.Context(),
		req.Name, req.Email, req.Phone, req.Password,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal membuat akun: " + err.Error()})
		return
	}

	err = ctrl.pedagangUsecase.CreatePengajuanByAdmin(
		c.Request.Context(),
		userID, req.NIK, req.NamaUsaha, req.JenisDagangan, req.PerkiraanHarga, req.Alamat,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan profil: " + err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Pedagang berhasil ditambahkan",
		"user_id": userID,
	})
}

func (ctrl *PedagangController) ListPedagangByAdmin(c *gin.Context) {
	users, total, err := ctrl.pedagangUsecase.ListPedagangByAdmin(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data pedagang"})
		return
	}

	c.JSON(http.StatusOK, entity.ListPedagangResponse{
		Users: users,
		Total: total,
	})
}

func (ctrl *PedagangController) GetPedagangStats(c *gin.Context) {
	stats, err := ctrl.pedagangUsecase.GetPedagangStats(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil statistik"})
		return
	}

	c.JSON(http.StatusOK, stats)
}

func (ctrl *PedagangController) GetPedagangByID(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID tidak boleh kosong"})
		return
	}

	user, err := ctrl.pedagangUsecase.GetPedagangByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Pedagang tidak ditemukan"})
		return
	}

	c.JSON(http.StatusOK, user)
}

// --- TAMBAHAN BARU: DeletePedagangByAdmin ---
func (ctrl *PedagangController) DeletePedagangByAdmin(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID tidak boleh kosong"})
		return
	}

	err := ctrl.pedagangUsecase.DeletePedagangByAdmin(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menghapus data"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Pedagang berhasil dihapus"})
}