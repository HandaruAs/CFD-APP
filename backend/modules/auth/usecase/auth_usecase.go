package usecase

import (
	"context"
	"errors"
	"net/mail"
	"strings"
	"time"

	"cfd-backend/modules/user/repository"
	"cfd-backend/pkg/auth"
	"cfd-backend/pkg/mailer"

	"golang.org/x/crypto/bcrypt"
)

const (
	otpTTL        = 10 * time.Minute
	resetTokenTTL = 10 * time.Minute
)

// UserRepository interface kecil -- isinya CUMA method yang dipakai
// AuthUsecase. Didefinisikan di sini (package usecase), bukan di package
// repository, sesuai idiom Go: interface didefinisikan di sisi yang PAKAI,
// bukan di sisi yang nyediain. Manfaatnya: AuthUsecase bisa di-test pakai
// mock repository, tanpa perlu database beneran nyala.
type UserRepository interface {
	RegisterPedagang(ctx context.Context, email, passwordHash, name, phone string) (string, error)
	GetUserForLogin(ctx context.Context, email string) (*repository.UserForLogin, error)
	GetUserRole(ctx context.Context, userID string) (string, error)

	// --- forgot/reset password (alur OTP) ---
	SaveOTP(ctx context.Context, userID, otpHash string, expiresAt time.Time) error
	GetOTPByUserID(ctx context.Context, userID string) (otpHash string, expiresAt time.Time, err error)
	RotateToVerifiedToken(ctx context.Context, userID, tokenHash string, expiresAt time.Time) error
	GetUserByResetTokenHash(ctx context.Context, tokenHash string) (user *repository.UserForLogin, verified bool, expiresAt time.Time, err error)
	UpdatePassword(ctx context.Context, userID, passwordHash string) error
	DeleteResetToken(ctx context.Context, userID string) error
}

type LoginUserData struct {
	ID    string
	Name  string
	Email string
	Role  string
}

type AuthUsecase interface {
	Register(ctx context.Context, email, password, name, phone string) (string, error)
	Login(ctx context.Context, email, password string) (string, LoginUserData, error)
	ForgotPassword(ctx context.Context, email string) error
	VerifyOTP(ctx context.Context, email, otp string) (resetToken string, err error)
	ResetPassword(ctx context.Context, resetToken, newPassword string) error
}

type authUsecase struct {
	userRepo  UserRepository // <- interface, bukan *repository.UserRepository lagi
	jwtSecret string
	mailer    mailer.Mailer
}

func NewAuthUsecase(userRepo UserRepository, jwtSecret string, m mailer.Mailer) AuthUsecase {
	return &authUsecase{
		userRepo:  userRepo,
		jwtSecret: jwtSecret,
		mailer:    m,
	}
}

func normalizeAndValidateEmail(raw string) (string, error) {
	email := strings.ToLower(strings.TrimSpace(raw))
	if _, err := mail.ParseAddress(email); err != nil {
		return "", errors.New("format email tidak valid")
	}
	return email, nil
}

func (u *authUsecase) generateToken(userID string) (string, error) {
	return auth.GenerateToken(userID, u.jwtSecret)
}

func (u *authUsecase) Register(ctx context.Context, email, password, name, phone string) (string, error) {
	validEmail, err := normalizeAndValidateEmail(email)
	if err != nil {
		return "", err
	}

	hashed, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", errors.New("gagal proses password")
	}

	userID, err := u.userRepo.RegisterPedagang(ctx, validEmail, string(hashed), name, phone)
	if err != nil {
		return "", err
	}

	return userID, nil
}

func (u *authUsecase) Login(ctx context.Context, email, password string) (string, LoginUserData, error) {
	validEmail, err := normalizeAndValidateEmail(email)
	if err != nil {
		return "", LoginUserData{}, err
	}

	user, err := u.userRepo.GetUserForLogin(ctx, validEmail)
	if err != nil {
		return "", LoginUserData{}, errors.New("email atau password salah")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return "", LoginUserData{}, errors.New("email atau password salah")
	}

	if user.Status != "active" {
		return "", LoginUserData{}, errors.New("akun tidak aktif")
	}

	role, err := u.userRepo.GetUserRole(ctx, user.ID)
	if err != nil {
		return "", LoginUserData{}, errors.New("akun tidak memiliki role, hubungi superadmin")
	}

	tok, err := u.generateToken(user.ID)
	if err != nil {
		return "", LoginUserData{}, errors.New("gagal membuat token")
	}

	userData := LoginUserData{
		ID:    user.ID,
		Name:  user.Name,
		Email: user.Email,
		Role:  role,
	}

	return tok, userData, nil
}

// ForgotPassword: cek email HARUS terdaftar di DB (sesuai alur di frontend),
// generate OTP 6 digit, simpan hash-nya, kirim ke email.
func (u *authUsecase) ForgotPassword(ctx context.Context, email string) error {
	validEmail, err := normalizeAndValidateEmail(email)
	if err != nil {
		return err
	}

	user, err := u.userRepo.GetUserForLogin(ctx, validEmail)
	if err != nil {
		return errors.New("email tidak terdaftar")
	}

	otp, otpHash, err := auth.GenerateOTP()
	if err != nil {
		return errors.New("gagal membuat kode OTP")
	}

	if err := u.userRepo.SaveOTP(ctx, user.ID, otpHash, time.Now().Add(otpTTL)); err != nil {
		return errors.New("gagal menyimpan OTP")
	}

	if err := u.mailer.SendPasswordResetOTP(ctx, user.Email, otp); err != nil {
		return errors.New("gagal mengirim email OTP")
	}

	return nil
}

// VerifyOTP: cocokkan OTP punya user ini, cek expiry. Kalau valid, rotate
// jadi reset-token baru (random, bukan OTP lagi) supaya OTP gak bisa dipakai
// dua kali dan halaman "set password baru" gak perlu OTP lagi.
func (u *authUsecase) VerifyOTP(ctx context.Context, email, otp string) (string, error) {
	validEmail, err := normalizeAndValidateEmail(email)
	if err != nil {
		return "", err
	}

	user, err := u.userRepo.GetUserForLogin(ctx, validEmail)
	if err != nil {
		return "", errors.New("email tidak terdaftar")
	}

	otpHash, expiresAt, err := u.userRepo.GetOTPByUserID(ctx, user.ID)
	if err != nil {
		return "", errors.New("OTP tidak valid atau sudah kadaluarsa")
	}
	if time.Now().After(expiresAt) {
		return "", errors.New("OTP tidak valid atau sudah kadaluarsa")
	}
	if auth.HashToken(otp) != otpHash {
		return "", errors.New("OTP salah")
	}

	resetTokenRaw, resetTokenHash, err := auth.GenerateResetToken()
	if err != nil {
		return "", errors.New("gagal membuat reset token")
	}

	if err := u.userRepo.RotateToVerifiedToken(ctx, user.ID, resetTokenHash, time.Now().Add(resetTokenTTL)); err != nil {
		return "", errors.New("gagal memverifikasi OTP")
	}

	return resetTokenRaw, nil
}

// ResetPassword: dipanggil dari halaman "set password baru", pakai
// reset-token hasil VerifyOTP (bukan OTP lagi).
func (u *authUsecase) ResetPassword(ctx context.Context, resetToken, newPassword string) error {
	if len(newPassword) < 8 {
		return errors.New("password minimal 8 karakter")
	}

	tokenHash := auth.HashToken(resetToken)

	user, verified, expiresAt, err := u.userRepo.GetUserByResetTokenHash(ctx, tokenHash)
	if err != nil {
		return errors.New("sesi reset password tidak valid, ulangi dari awal")
	}
	if !verified || time.Now().After(expiresAt) {
		_ = u.userRepo.DeleteResetToken(ctx, user.ID)
		return errors.New("sesi reset password tidak valid, ulangi dari awal")
	}

	hashed, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return errors.New("gagal proses password")
	}

	if err := u.userRepo.UpdatePassword(ctx, user.ID, string(hashed)); err != nil {
		return errors.New("gagal update password")
	}

	_ = u.userRepo.DeleteResetToken(ctx, user.ID)
	return nil
}