package usecase

import (
	"context"
	"errors"

	"cfd-backend/modules/menu/entity"
	pedagangEntity "cfd-backend/modules/pedagang/entity"
)

// MenuRepository -- method yang dipakai MenuUsecase aja.
type MenuRepository interface {
	GetMenusByRoleSlug(ctx context.Context, roleSlug string, pedagangStage *string) ([]*entity.MenuItem, error)
	ListAllMenus(ctx context.Context) ([]*entity.AdminMenuItem, error)
	CreateMenu(ctx context.Context, in entity.MenuInput) (string, error)
	UpdateMenu(ctx context.Context, id string, in entity.MenuInput) error
	DeleteMenu(ctx context.Context, id string) error
	ListRoles(ctx context.Context) ([]entity.RoleOption, error)
}

type UserRoleGetter interface {
	GetUserRole(ctx context.Context, userID string) (string, error)
}

type PedagangStatusGetter interface {
	GetPengajuanByUserID(ctx context.Context, userID string) (*pedagangEntity.PengajuanStatus, error)
}

type MenuUsecase interface {
	GetMyMenus(ctx context.Context, userID string) ([]*entity.MenuItem, error)
	// -- menu management (superadmin) --
	ListAllMenus(ctx context.Context) ([]*entity.AdminMenuItem, error)
	CreateMenu(ctx context.Context, in entity.MenuInput) (string, error)
	UpdateMenu(ctx context.Context, id string, in entity.MenuInput) error
	DeleteMenu(ctx context.Context, id string) error
	ListRoles(ctx context.Context) ([]entity.RoleOption, error)
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

// ListAllMenus ambil semua menu (flat) buat halaman menu management.
func (u *menuUsecase) ListAllMenus(ctx context.Context) ([]*entity.AdminMenuItem, error) {
	return u.menuRepo.ListAllMenus(ctx)
}

// CreateMenu bikin menu baru + assign ke role yang dipilih.
func (u *menuUsecase) CreateMenu(ctx context.Context, in entity.MenuInput) (string, error) {
	if err := validateMenuInput(in); err != nil {
		return "", err
	}
	return u.menuRepo.CreateMenu(ctx, in)
}

// UpdateMenu update data menu + REPLACE penuh role assignment-nya.
func (u *menuUsecase) UpdateMenu(ctx context.Context, id string, in entity.MenuInput) error {
	if id == "" {
		return errors.New("id menu wajib diisi")
	}
	if in.ParentID != nil && *in.ParentID == id {
		return errors.New("menu tidak boleh jadi parent dari dirinya sendiri")
	}
	if err := validateMenuInput(in); err != nil {
		return err
	}
	return u.menuRepo.UpdateMenu(ctx, id, in)
}

// DeleteMenu soft delete 1 menu. Ditolak kalau menu ini masih punya
// submenu aktif (lihat entity.ErrMenuHasChildren).
func (u *menuUsecase) DeleteMenu(ctx context.Context, id string) error {
	if id == "" {
		return errors.New("id menu wajib diisi")
	}
	return u.menuRepo.DeleteMenu(ctx, id)
}

// ListRoles ambil semua role, buat isi checkbox role-picker di form.
func (u *menuUsecase) ListRoles(ctx context.Context) ([]entity.RoleOption, error) {
	return u.menuRepo.ListRoles(ctx)
}

func validateMenuInput(in entity.MenuInput) error {
	if in.Name == "" {
		return errors.New("nama menu wajib diisi")
	}
	if in.Slug == "" {
		return errors.New("slug menu wajib diisi")
	}
	if len(in.RoleSlugs) == 0 {
		return errors.New("minimal 1 role wajib dipilih")
	}
	return nil
}