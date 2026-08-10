package repository

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

type PermissionRepository struct {
	db *pgxpool.Pool
}

func NewPermissionRepository(db *pgxpool.Pool) *PermissionRepository {
	return &PermissionRepository{db: db}
}

// UserHasPermission mengecek apakah user (lewat salah satu role yang dia
// punya) memiliki permission tertentu. Ini jantungnya authorization —
// tidak peduli role-nya apa namanya, cuma peduli permission slug-nya cocok.
//
// PENTING: setiap tabel di rantai ini (user_roles, roles, role_permissions,
// permissions) pakai soft-delete, jadi WAJIB dicek deleted_at IS NULL di
// masing-masing. Kalau tidak, role yang sudah dicabut dari user atau
// permission yang sudah dicabut dari role tetap dianggap valid selama
// baris lamanya masih ada di DB.
func (r *PermissionRepository) UserHasPermission(ctx context.Context, userID, permissionSlug string) (bool, error) {
	var exists bool
	err := r.db.QueryRow(ctx, `
		SELECT EXISTS (
			SELECT 1
			FROM user_roles ur
			JOIN roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
			JOIN role_permissions rp ON rp.role_id = ur.role_id AND rp.deleted_at IS NULL
			JOIN permissions p ON p.id = rp.permission_id AND p.deleted_at IS NULL
			WHERE ur.user_id = $1
			  AND ur.deleted_at IS NULL
			  AND p.slug = $2
		)
	`, userID, permissionSlug).Scan(&exists)
	if err != nil {
		return false, err
	}
	return exists, nil
}