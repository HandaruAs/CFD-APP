package controller

import (
	"errors"
	"net/http"

	"cfd-backend/modules/auth/usecase"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgconn"
)

// --- DTO REQUEST (Input JSON dari frontend) ---
type RegisterRequest struct {
	Email    string `json:"email" binding:"required"`
	Password string `json:"password" binding:"required,min=8"`
	Name     string `json:"name" binding:"required"`
	Phone    string `json:"phone"`
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// --- DTO RESPONSE (JSON yang dikirim ke frontend) ---
type LoginResponse struct {
	Token string `json:"token"`
	User  struct {
		ID    string `json:"id"`
		Name  string `json:"name"`
		Email string `json:"email"`
		Role  string `json:"role"`
	} `json:"user"`
}

type AuthController struct {
	authUsecase usecase.AuthUsecase
}

func NewAuthController(authUsecase usecase.AuthUsecase) *AuthController {
	return &AuthController{authUsecase: authUsecase}
}

// RegisterPedagang menangani POST /api/register
func (ctrl *AuthController) RegisterPedagang(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Panggil Usecase (bukan repository langsung!)
	userID, err := ctrl.authUsecase.Register(c.Request.Context(), req.Email, req.Password, req.Name, req.Phone)
	if err != nil {
		// Handle duplicate email (PostgreSQL error code 23505)
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			c.JSON(http.StatusConflict, gin.H{"error": "email sudah terdaftar"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal mendaftar: " + err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "akun berhasil dibuat, silakan login lalu lengkapi pengajuan usaha dari dashboard",
		"user_id": userID,
	})
}

// Login menangani POST /api/login
func (ctrl *AuthController) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Panggil Usecase Login. Usecase akan return (token, userData, error)
	token, userData, err := ctrl.authUsecase.Login(c.Request.Context(), req.Email, req.Password)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	// Susun Response JSON
	var resp LoginResponse
	resp.Token = token
	resp.User.ID = userData.ID
	resp.User.Name = userData.Name
	resp.User.Email = userData.Email
	resp.User.Role = userData.Role

	c.JSON(http.StatusOK, resp)
}