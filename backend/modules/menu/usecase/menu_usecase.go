package usecase

import (
	"context"

	"cfd-backend/modules/menu/entity"
	pedagangEntity "cfd-backend/modules/pedagang/entity"
)

// 3 interface kecil terpisah -- masing-masing cuma 1 method, persis yang
// dipakai MenuUsecase. Ini juga yang bikin bug "cannot use *MenuRepository
// as MenuRepository value" kemarin otomatis hilang -- interface bisa
// nerima pointer TANPA masalah, beda dari struct value yang strict.
type MenuRepository interface {
	GetMenusByRoleSlug(ctx context.Context, roleSlug string, pedagangStage *string) ([]*entity.MenuItem, error)
}

type UserRoleGetter interface {
	GetUserRole(ctx context.Context, userID string) (string, error)
}

type PedagangStatusGetter interface {
	GetPengajuanByUserID(ctx context.Context, userID string) (*pedagangEntity.PengajuanStatus, error)
}

type MenuUsecase interface {
	GetMyMenus(ctx context.Context, userID string) ([]*entity.MenuItem, error)
}

type menuUsecase struct {
	menuRepo     MenuRepository
	userRepo     UserRoleGetter
	pedagangRepo PedagangStatusGetter
}

func NewMenuUsecase(menuRepo MenuRepository, userRepo UserRoleGetter, pedagangRepo PedagangStatusGetter) MenuUsecase {
	return &menuUsecase{
		menuRepo:     menuRepo,
		userRepo:     userRepo,
		pedagangRepo: pedagangRepo,
	}
}

func (u *menuUsecase) GetMyMenus(ctx context.Context, userID string) ([]*entity.MenuItem, error) {
	roleSlug, err := u.userRepo.GetUserRole(ctx, userID)
	if err != nil {
		return nil, err
	}

	var pedagangStage *string
	if roleSlug == "pedagang" {
		pengajuan, err := u.pedagangRepo.GetPengajuanByUserID(ctx, userID)
		if err != nil {
			return nil, err
		}

		stage := "unverified"
		if pengajuan != nil && pengajuan.StatusVerifikasi == "approved" {
			stage = "verified"
		}
		pedagangStage = &stage
	}

	return u.menuRepo.GetMenusByRoleSlug(ctx, roleSlug, pedagangStage)
}