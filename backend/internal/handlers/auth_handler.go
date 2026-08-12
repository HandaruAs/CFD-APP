package handlers

import (
	"errors"
	"net/http"
	"net/mail"
	"strings"

	"cfd-backend/internal/auth"
	"cfd-backend/internal/models"
	"cfd-backend/internal/repository"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgconn"
	"golang.org/x/crypto/bcrypt"
)

type AuthHandler struct {
	userRepo  *repository.UserRepository
	jwtSecret string
}

func NewAuthHandler(userRepo *repository.UserRepository, jwtSecret string) *AuthHandler {
	return &AuthHandler{userRepo: userRepo, jwtSecret: jwtSecret}
}

// normalizeAndValidateEmail membersihkan whitespace di ujung string dan
// menyamakan huruf jadi lowercase, lalu memvalidasi formatnya pakai
// net/mail (standard library, RFC 5322). Dipakai di Login & Register
// biar satu aturan berlaku ke semua endpoint & semua client (web,
// mobile, dst) -- bukan tanggung jawab masing-masing frontend lagi.
func normalizeAndValidateEmail(raw string) (string, error) {
	email := strings.ToLower(strings.TrimSpace(raw))
	if _, err := mail.ParseAddress(email); err != nil {
		return "", errors.New("format email tidak valid")
	}
	return email, nil
}

func (h *AuthHandler) RegisterPedagang(c *gin.Context) {
	var req models.RegisterPedagangRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	email, err := normalizeAndValidateEmail(req.Email)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	hashed, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal proses password"})
		return
	}

	userID, err := h.userRepo.RegisterPedagang(
		c.Request.Context(),
		email, string(hashed), req.Name, req.Phone,
	)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			c.JSON(http.StatusConflict, gin.H{"error": "email sudah terdaftar"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal mendaftar"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "akun berhasil dibuat, silakan login lalu lengkapi pengajuan usaha dari dashboard",
		"user_id": userID,
	})
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req models.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	email, err := normalizeAndValidateEmail(req.Email)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, err := h.userRepo.GetUserForLogin(c.Request.Context(), email)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "email atau password salah"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "email atau password salah"})
		return
	}

	if user.Status != "active" {
		c.JSON(http.StatusForbidden, gin.H{"error": "akun tidak aktif"})
		return
	}

	role, err := h.userRepo.GetUserRole(c.Request.Context(), user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "akun tidak memiliki role, hubungi superadmin"})
		return
	}

	token, err := auth.GenerateToken(user.ID, h.jwtSecret)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal membuat token"})
		return
	}

	var resp models.LoginResponse
	resp.Token = token
	resp.User.ID = user.ID
	resp.User.Name = user.Name
	resp.User.Email = user.Email
	resp.User.Role = role

	c.JSON(http.StatusOK, resp)
}

// Me mengembalikan data user yang lagi login, diambil dari user_id
// yang udah divalidasi AuthMiddleware.
func (h *AuthHandler) Me(c *gin.Context) {
	userID, _ := c.Get("user_id")

	user, err := h.userRepo.GetByID(c.Request.Context(), userID.(string))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user tidak ditemukan"})
		return
	}

	role, err := h.userRepo.GetUserRole(c.Request.Context(), user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal mengambil role user"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id":     user.ID,
		"name":   user.Name,
		"email":  user.Email,
		"status": user.Status,
		"role":   role,
	})
}