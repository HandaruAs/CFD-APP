package controller

import (
	"errors"
	"cfd-backend/modules/auth/usecase"
	"github.com/gofiber/fiber/v3"
	"github.com/jackc/pgx/v5/pgconn"
)

// --- DTO REQUEST (Input JSON dari frontend) ---
type RegisterRequest struct {
	Email    string `json:"email" validate:"required"`
	Password string `json:"password" validate:"required,min=8"`
	Name     string `json:"name" validate:"required"`
	Phone    string `json:"phone"`
}

type LoginRequest struct {
	Email    string `json:"email" validate:"required"`
	Password string `json:"password" validate:"required"`
}

type ForgotPasswordRequest struct {
	Email string `json:"email" validate:"required"`
}

type VerifyOTPRequest struct {
	Email string `json:"email" validate:"required"`
	OTP   string `json:"otp" validate:"required,len=6"`
}

type ResetPasswordRequest struct {
	ResetToken string `json:"reset_token" validate:"required"`
	Password   string `json:"password" validate:"required,min=8"`
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
func (ctrl *AuthController) RegisterPedagang(c fiber.Ctx) error {
	var req RegisterRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	userID, err := ctrl.authUsecase.Register(c.Context(), req.Email, req.Password, req.Name, req.Phone)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{
				"error": "email sudah terdaftar",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "gagal mendaftar: " + err.Error(),
		})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message": "akun berhasil dibuat, silakan login lalu lengkapi pengajuan usaha dari dashboard",
		"user_id": userID,
	})
}

// Login menangani POST /api/login
func (ctrl *AuthController) Login(c fiber.Ctx) error {
	var req LoginRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	token, userData, err := ctrl.authUsecase.Login(c.Context(), req.Email, req.Password)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	var resp LoginResponse
	resp.Token = token
	resp.User.ID = userData.ID
	resp.User.Name = userData.Name
	resp.User.Email = userData.Email
	resp.User.Role = userData.Role

	return c.Status(fiber.StatusOK).JSON(resp)
}

// ForgotPassword menangani POST /api/forgot-password
// Email HARUS terdaftar di DB -- kalau enggak, balas error (sesuai alur
// frontend yang langsung lanjut ke halaman verifikasi OTP).
func (ctrl *AuthController) ForgotPassword(c fiber.Ctx) error {
	var req ForgotPasswordRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	if err := ctrl.authUsecase.ForgotPassword(c.Context(), req.Email); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "kode OTP sudah dikirim ke email kamu",
	})
}

// VerifyOTP menangani POST /api/verify-otp
// Balikin reset_token buat dipakai di halaman set-password-baru, biar
// OTP-nya sendiri gak perlu dikirim ulang di step berikutnya.
func (ctrl *AuthController) VerifyOTP(c fiber.Ctx) error {
	var req VerifyOTPRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	resetToken, err := ctrl.authUsecase.VerifyOTP(c.Context(), req.Email, req.OTP)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message":     "OTP valid",
		"reset_token": resetToken,
	})
}

// ResetPassword menangani POST /api/reset-password
func (ctrl *AuthController) ResetPassword(c fiber.Ctx) error {
	var req ResetPasswordRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	if err := ctrl.authUsecase.ResetPassword(c.Context(), req.ResetToken, req.Password); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "password berhasil direset, silakan login",
	})
}