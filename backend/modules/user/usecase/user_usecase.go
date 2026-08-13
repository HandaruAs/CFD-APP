package usecase

import (
	"context"

	"cfd-backend/modules/user/entity"
)

// UserRepository interface kecil -- method yang dipakai UserUsecase aja.
type UserRepository interface {
	GetByID(ctx context.Context, id string) (*entity.UserProfile, error)
	GetUserRole(ctx context.Context, userID string) (string, error)
}

type UserUsecase interface {
	GetUserProfile(ctx context.Context, userID string) (*entity.UserProfile, error)
	GetUserRole(ctx context.Context, userID string) (string, error)
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