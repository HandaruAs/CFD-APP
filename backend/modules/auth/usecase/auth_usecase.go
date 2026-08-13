package usecase

import (
	"context"
	"errors"
	"net/mail"
	"strings"

	"cfd-backend/modules/user/repository"
	"cfd-backend/pkg/auth"

	"golang.org/x/crypto/bcrypt"
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
}

type authUsecase struct {
	userRepo  UserRepository // <- interface, bukan *repository.UserRepository lagi
	jwtSecret string
}

func NewAuthUsecase(userRepo UserRepository, jwtSecret string) AuthUsecase {
	return &authUsecase{
		userRepo:  userRepo,
		jwtSecret: jwtSecret,
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

	token, err := u.generateToken(user.ID)
	if err != nil {
		return "", LoginUserData{}, errors.New("gagal membuat token")
	}

	userData := LoginUserData{
		ID:    user.ID,
		Name:  user.Name,
		Email: user.Email,
		Role:  role,
	}

	return token, userData, nil
}