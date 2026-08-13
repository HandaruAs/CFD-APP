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