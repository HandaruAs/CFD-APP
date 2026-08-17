package usecase

import (
	"context"
	"cfd-backend/modules/user/entity"
	"golang.org/x/crypto/bcrypt"
)

// UserRepository interface kecil -- method yang dipakai UserUsecase aja.
type UserRepository interface {
	GetByID(ctx context.Context, id string) (*entity.UserProfile, error)
	GetUserRole(ctx context.Context, userID string) (string, error)
	RegisterPedagangByAdmin(ctx context.Context, email, passwordHash, name, phone string) (string, error)
}

type UserUsecase interface {
	GetUserProfile(ctx context.Context, userID string) (*entity.UserProfile, error)
	GetUserRole(ctx context.Context, userID string) (string, error)
	RegisterPedagangByAdmin(ctx context.Context, name, email, phone, password string) (string, error)
}

type userUsecase struct {
	userRepo UserRepository
}

func NewUserUsecase(userRepo UserRepository) UserUsecase {
	return &userUsecase{userRepo: userRepo}
}

func (u *userUsecase) GetUserProfile(ctx context.Context, userID string) (*entity.UserProfile, error) {
	return u.userRepo.GetByID(ctx, userID)
}

func (u *userUsecase) GetUserRole(ctx context.Context, userID string) (string, error) {
	return u.userRepo.GetUserRole(ctx, userID)
}

func (u *userUsecase) RegisterPedagangByAdmin(ctx context.Context, name, email, phone, password string) (string, error) {
	// Hash password menggunakan bcrypt
	hashed, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	// Panggil repository untuk insert user + assign role pedagang
	return u.userRepo.RegisterPedagangByAdmin(ctx, email, string(hashed), name, phone)
}