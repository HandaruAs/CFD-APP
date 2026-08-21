package usecase

import (
	"context"
	"errors"

	"cfd-backend/modules/user/entity"

	"golang.org/x/crypto/bcrypt"
)

// UserRepository interface kecil -- method yang dipakai UserUsecase aja.
type UserRepository interface {
	GetByID(ctx context.Context, id string) (*entity.UserProfile, error)
	GetUserRole(ctx context.Context, userID string) (string, error)
	RegisterPedagangByAdmin(ctx context.Context, email, passwordHash, name, phone string) (string, error)
	GetUserStatsByRole(ctx context.Context, roleSlug string) (entity.UserStats, error)
	ListUsersByRole(ctx context.Context, roleSlug, search string) ([]entity.UserManagementDTO, int, error)
	CreateUserByRole(ctx context.Context, email, passwordHash, name, phone, roleSlug string) (string, error)
	UpdateUserBasic(ctx context.Context, id, name, phone string) error
	DeleteUser(ctx context.Context, id string) error
	CountByRole(ctx context.Context, roleSlug string) (int, error)
}

type UserUsecase interface {
	GetUserProfile(ctx context.Context, userID string) (*entity.UserProfile, error)
	GetUserRole(ctx context.Context, userID string) (string, error)
	RegisterPedagangByAdmin(ctx context.Context, name, email, phone, password string) (string, error)
	GetUserStatsByRole(ctx context.Context, roleSlug string) (entity.UserStats, error)
	ListUsersByRole(ctx context.Context, roleSlug, search string) ([]entity.UserManagementDTO, int, error)
	CreateUserByRole(ctx context.Context, name, email, phone, password, roleSlug string) (string, error)
	UpdateUserBasic(ctx context.Context, id, name, phone string) error
	DeleteUser(ctx context.Context, id string) error
	DeleteSuperadmin(ctx context.Context, requesterID, targetID string) error
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

// GetUserStatsByRole ambil ringkasan jumlah user (total + per status) untuk 1 role.
func (u *userUsecase) GetUserStatsByRole(ctx context.Context, roleSlug string) (entity.UserStats, error) {
	if roleSlug == "" {
		return entity.UserStats{}, errors.New("role wajib diisi")
	}
	return u.userRepo.GetUserStatsByRole(ctx, roleSlug)
}

// ListUsersByRole ambil semua user (beserta total) yang punya role tertentu.
func (u *userUsecase) ListUsersByRole(ctx context.Context, roleSlug, search string) ([]entity.UserManagementDTO, int, error) {
	if roleSlug == "" {
		return nil, 0, errors.New("role wajib diisi")
	}
	return u.userRepo.ListUsersByRole(ctx, roleSlug, search)
}

// CreateUserByRole dipakai superadmin buat bikin akun petugas/pedagang langsung
// (beda dari RegisterPedagangByAdmin yang khusus alur pengajuan pedagang).
func (u *userUsecase) CreateUserByRole(ctx context.Context, name, email, phone, password, roleSlug string) (string, error) {
	if roleSlug == "" {
		return "", errors.New("role wajib diisi")
	}

	hashed, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}

	return u.userRepo.CreateUserByRole(ctx, email, string(hashed), name, phone, roleSlug)
}

// UpdateUserBasic dipakai admin buat edit nama & telepon (petugas, dkk).
func (u *userUsecase) UpdateUserBasic(ctx context.Context, id, name, phone string) error {
	if id == "" {
		return errors.New("id wajib diisi")
	}
	return u.userRepo.UpdateUserBasic(ctx, id, name, phone)
}

// DeleteUser soft-delete user (dipakai admin buat hapus petugas, dkk).
func (u *userUsecase) DeleteUser(ctx context.Context, id string) error {
	if id == "" {
		return errors.New("id wajib diisi")
	}
	return u.userRepo.DeleteUser(ctx, id)
}

// DeleteSuperadmin soft-delete akun superadmin, dengan 2 guard tambahan
// dibanding DeleteUser biasa: superadmin nggak boleh hapus akunnya sendiri,
// dan superadmin terakhir yang tersisa nggak boleh dihapus sama sekali --
// biar sistem nggak pernah kehilangan akses penuh.
func (u *userUsecase) DeleteSuperadmin(ctx context.Context, requesterID, targetID string) error {
	if targetID == "" {
		return errors.New("id wajib diisi")
	}
	if requesterID == targetID {
		return entity.ErrCannotDeleteSelf
	}

	count, err := u.userRepo.CountByRole(ctx, "superadmin")
	if err != nil {
		return err
	}
	if count <= 1 {
		return entity.ErrLastSuperadmin
	}

	return u.userRepo.DeleteUser(ctx, targetID)
}