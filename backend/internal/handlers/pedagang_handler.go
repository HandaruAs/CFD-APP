package handlers

import (
	"errors"
	"net/http"

	"cfd-backend/internal/models"
	"cfd-backend/internal/repository"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgconn"
)

type PedagangHandler struct {
	pedagangRepo *repository.PedagangRepository
}

func NewPedagangHandler(pedagangRepo *repository.PedagangRepository) *PedagangHandler {
	return &PedagangHandler{pedagangRepo: pedagangRepo}
}

// AjukanUsaha — dipanggil dari dashboard SETELAH user login (lewat Google
// OAuth ataupun email/password). userID selalu diambil dari context hasil
// AuthMiddleware, tidak pernah dipercaya dari body request.
func (h *PedagangHandler) AjukanUsaha(c *gin.Context) {
	var req models.PengajuanUsahaRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID, _ := c.Get("user_id")

	id, err := h.pedagangRepo.CreatePengajuan(
		c.Request.Context(),
		userID.(string),
		req.NIK, req.NamaUsaha, req.JenisDagangan, req.Alamat,
	)
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
		"pengajuan_id": id,
	})
}

// StatusPengajuan — dipakai dashboard buat nampilin status pengajuan
// pedagang yang lagi login: belum ajukan, pending, approved, atau rejected.
func (h *PedagangHandler) StatusPengajuan(c *gin.Context) {
	userID, _ := c.Get("user_id")

	pengajuan, err := h.pedagangRepo.GetPengajuanByUserID(c.Request.Context(), userID.(string))
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