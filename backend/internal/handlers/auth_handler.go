package handlers

import (
	"errors"
	"net/http"

	"cfd-backend/internal/auth"
	"cfd-backend/internal/models"
	"cfd-backend/internal/oauth"
	"cfd-backend/internal/repository"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgconn"
	"golang.org/x/crypto/bcrypt"
)

type AuthHandler struct {
	userRepo       *repository.UserRepository
	jwtSecret      string
	googleVerifier *oauth.GoogleVerifier
}

func NewAuthHandler(userRepo *repository.UserRepository, jwtSecret string, googleVerifier *oauth.GoogleVerifier) *AuthHandler {
	return &AuthHandler{userRepo: userRepo, jwtSecret: jwtSecret, googleVerifier: googleVerifier}
}

func (h *AuthHandler) RegisterPedagang(c *gin.Context) {
	var req models.RegisterPedagangRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	hashed, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal proses password"})
		return
	}

	// Register cuma bikin AKUN (role pedagang otomatis). Data usaha (NIK,
	// nama usaha, dll) diisi belakangan lewat /api/pedagang/pengajuan
	// setelah user ini login.
	userID, err := h.userRepo.RegisterPedagang(
		c.Request.Context(),
		req.Email, string(hashed), req.Name, req.Phone,
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

	user, err := h.userRepo.GetUserForLogin(c.Request.Context(), req.Email)
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
		// Harusnya tidak pernah terjadi (register & seeder selalu assign
		// role), tapi kalau sampai kejadian, jangan lolosin token tanpa
		// role — frontend butuh ini buat nentuin dashboard mana.
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

// GoogleLogin — endpoint tunggal buat register DAN login lewat Google.
// Frontend kirim ID token yang didapat langsung dari Google (bukan bikin
// sendiri). Kalau ini pertama kalinya akun Google ini dipakai, otomatis
// dibikinin akun baru (role pedagang, tanpa password). Kalau udah pernah,
// tinggal login. Pedagang masih perlu panggil /api/pedagang/pengajuan
// terpisah setelah ini buat lengkapi biodata usahanya.
func (h *AuthHandler) GoogleLogin(c *gin.Context) {
	var req models.GoogleLoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	claims, err := h.googleVerifier.Verify(c.Request.Context(), req.IDToken)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "token Google tidak valid"})
		return
	}

	userID, err := h.userRepo.GetOrCreateByGoogle(c.Request.Context(), claims.Sub, claims.Email, claims.Name)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			c.JSON(http.StatusConflict, gin.H{"error": "email ini sudah terdaftar lewat cara lain, silakan login manual"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal login dengan Google"})
		return
	}

	token, err := auth.GenerateToken(userID, h.jwtSecret)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal membuat token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token": token,
		"user": gin.H{
			"id":    userID,
			"name":  claims.Name,
			"email": claims.Email,
		},
	})
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

	// Disertakan juga di sini (bukan cuma pas login) supaya kalau user
	// refresh halaman dashboard, frontend tetap bisa tahu harus nampilin
	// dashboard yang mana tanpa perlu login ulang.
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