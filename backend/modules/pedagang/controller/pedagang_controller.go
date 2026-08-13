package controller

import (
	"errors"
	"net/http"

	"cfd-backend/modules/pedagang/entity"
	"cfd-backend/modules/pedagang/usecase"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgconn"
)

type PedagangController struct {
	pedagangUsecase usecase.PedagangUsecase
}

func NewPedagangController(pedagangUsecase usecase.PedagangUsecase) *PedagangController {
	return &PedagangController{pedagangUsecase: pedagangUsecase}
}

// AjukanUsaha — dipanggil dari dashboard SETELAH user login.
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

// StatusPengajuan — dipakai dashboard buat nampilin status pengajuan pedagang yang lagi login.
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
		"alamat":         pengajuan.Alamat,
		"status":         pengajuan.StatusVerifikasi,
		"catatan":        pengajuan.Catatan,
	})
}