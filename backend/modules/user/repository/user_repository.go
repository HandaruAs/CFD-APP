package repository

import (
	"context"
	"database/sql"

	"cfd-backend/modules/user/entity"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type UserRepository struct {
	db *pgxpool.Pool
}

func NewUserRepository(db *pgxpool.Pool) *UserRepository {
	return &UserRepository{db: db}
}

// RegisterPedagang bikin AKUN saja (users + role pedagang).
func (r *UserRepository) RegisterPedagang(ctx context.Context, email, passwordHash, name, phone string) (string, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return "", err
	}
	defer tx.Rollback(ctx)

	var userID string
	err = tx.QueryRow(ctx,
		`INSERT INTO users (email, password, name, phone) VALUES ($1, $2, $3, $4) RETURNING id`,
		email, passwordHash, name, phone,
	).Scan(&userID)
	if err != nil {
		return "", err
	}

	var roleID string
	err = tx.QueryRow(ctx,
		`SELECT id FROM roles WHERE slug = 'pedagang' AND deleted_at IS NULL`,
	).Scan(&roleID)
	if err != nil {
		return "", err
	}

	_, err = tx.Exec(ctx,
		`INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)`,
		userID, roleID,
	)
	if err != nil {
		return "", err
	}

	if err := tx.Commit(ctx); err != nil {
		return "", err
	}

	return userID, nil
}

type UserForLogin struct {
	ID           string
	Name         string
	Email        string
	PasswordHash string
	Status       string
}

func (r *UserRepository) GetUserForLogin(ctx context.Context, email string) (*UserForLogin, error) {
	var u UserForLogin
	err := r.db.QueryRow(ctx,
		`SELECT id, name, email, password, status
		 FROM users
		 WHERE lower(email) = lower($1) AND deleted_at IS NULL`,
		email,
	).Scan(&u.ID, &u.Name, &u.Email, &u.PasswordHash, &u.Status)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

// GetByID dipakai endpoint /api/me — ambil data user dari user_id
// yang udah divalidasi AuthMiddleware lewat token JWT.
func (r *UserRepository) GetByID(ctx context.Context, id string) (*entity.UserProfile, error) {
	var u entity.UserProfile
	err := r.db.QueryRow(ctx,
		`SELECT id, name, email, phone, status
		 FROM users
		 WHERE id = $1 AND deleted_at IS NULL`,
		id,
	).Scan(&u.ID, &u.Name, &u.Email, &u.Phone, &u.Status)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

// GetUserRole ambil slug role milik user.
func (r *UserRepository) GetUserRole(ctx context.Context, userID string) (string, error) {
	var slug string
	err := r.db.QueryRow(ctx,
		`SELECT r.slug
		 FROM user_roles ur
		 JOIN roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
		 WHERE ur.user_id = $1 AND ur.deleted_at IS NULL
		 ORDER BY ur.created_at ASC
		 LIMIT 1`,
		userID,
	).Scan(&slug)
	if err != nil {
		return "", err
	}
	return slug, nil
}

// CountByRole hitung berapa user (yang belum dihapus) punya role tertentu.
// Dipakai buat guard "jangan sampai superadmin terakhir kehapus".
func (r *UserRepository) CountByRole(ctx context.Context, roleSlug string) (int, error) {
	var count int
	err := r.db.QueryRow(ctx,
		`SELECT COUNT(*)
		 FROM users u
		 JOIN user_roles ur ON ur.user_id = u.id AND ur.deleted_at IS NULL
		 JOIN roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
		 WHERE r.slug = $1 AND u.deleted_at IS NULL`,
		roleSlug,
	).Scan(&count)
	if err != nil {
		return 0, err
	}
	return count, nil
}

// UpdateUserBasic dipakai admin buat edit nama & telepon petugas
func (r *UserRepository) UpdateUserBasic(ctx context.Context, id, name, phone string) error {
	_, err := r.db.Exec(ctx,
		`UPDATE users SET name = $1, phone = $2, updated_at = now() WHERE id = $3 AND deleted_at IS NULL`,
		name, phone, id,
	)
	return err
}

// DeleteUser soft-delete user (dipakai buat hapus petugas dari Manajemen User).
func (r *UserRepository) DeleteUser(ctx context.Context, id string) error {
	_, err := r.db.Exec(ctx, `UPDATE users SET deleted_at = now() WHERE id = $1`, id)
	return err
}

func (r *UserRepository) RegisterPedagangByAdmin(ctx context.Context, email, passwordHash, name, phone string) (string, error) {
	return r.createUserWithRole(ctx, email, passwordHash, name, phone, "pedagang")
}

// GetUserStatsByRole hitung total user + breakdown per status (active/suspended/banned)
// untuk 1 role tertentu.
func (r *UserRepository) GetUserStatsByRole(ctx context.Context, roleSlug string) (entity.UserStats, error) {
	rows, err := r.db.Query(ctx,
		`SELECT u.status, COUNT(*)
		 FROM users u
		 JOIN user_roles ur ON ur.user_id = u.id AND ur.deleted_at IS NULL
		 JOIN roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
		 WHERE r.slug = $1 AND u.deleted_at IS NULL
		 GROUP BY u.status`,
		roleSlug,
	)
	if err != nil {
		return entity.UserStats{}, err
	}
	defer rows.Close()

	var stats entity.UserStats
	for rows.Next() {
		var status string
		var count int
		if err := rows.Scan(&status, &count); err != nil {
			return entity.UserStats{}, err
		}
		switch status {
		case "active":
			stats.Active = count
		case "suspended":
			stats.Suspended = count
		case "banned":
			stats.Banned = count
		}
		stats.Total += count
	}
	if err := rows.Err(); err != nil {
		return entity.UserStats{}, err
	}

	return stats, nil
}

// ListUsersByRole ambil semua user (tanpa paginasi) yang punya role tertentu,
// dengan filter opsional search (nama/email/phone).
func (r *UserRepository) ListUsersByRole(ctx context.Context, roleSlug, search string) ([]entity.UserManagementDTO, int, error) {
	rows, err := r.db.Query(ctx,
		`SELECT u.id, u.name, u.email, u.phone, u.created_at, u.status
		 FROM users u
		 JOIN user_roles ur ON ur.user_id = u.id AND ur.deleted_at IS NULL
		 JOIN roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
		 WHERE r.slug = $1 AND u.deleted_at IS NULL
		   AND ($2 = '' OR u.name ILIKE '%' || $2 || '%' OR u.email ILIKE '%' || $2 || '%' OR u.phone ILIKE '%' || $2 || '%')
		 ORDER BY u.created_at DESC`,
		roleSlug, search,
	)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	users := make([]entity.UserManagementDTO, 0)
	for rows.Next() {
		var u entity.UserManagementDTO
		var createdAt, status sql.NullString

		if err := rows.Scan(&u.ID, &u.Name, &u.Email, &u.Phone, &createdAt, &status); err != nil {
			return nil, 0, err
		}

		u.JoinedAt = createdAt.String
		u.Active = status.String == "active"
		if len(u.Name) > 0 {
			u.Initial = string([]rune(u.Name)[0])
		}

		users = append(users, u)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, err
	}

	return users, len(users), nil
}

// CreateUserByRole bikin akun baru langsung dengan role apapun (dipakai superadmin
// untuk bikin akun petugas atau pedagang tanpa lewat alur pengajuan).
func (r *UserRepository) CreateUserByRole(ctx context.Context, email, passwordHash, name, phone, roleSlug string) (string, error) {
	return r.createUserWithRole(ctx, email, passwordHash, name, phone, roleSlug)
}

// createUserWithRole helper internal: insert users + assign 1 role dalam 1 transaksi.
func (r *UserRepository) createUserWithRole(ctx context.Context, email, passwordHash, name, phone, roleSlug string) (string, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return "", err
	}
	defer tx.Rollback(ctx)

	var userID string
	err = tx.QueryRow(ctx,
		`INSERT INTO users (email, password, name, phone, status) VALUES ($1, $2, $3, $4, 'active') RETURNING id`,
		email, passwordHash, name, phone,
	).Scan(&userID)
	if err != nil {
		return "", err
	}

	var roleID string
	err = tx.QueryRow(ctx,
		`SELECT id FROM roles WHERE slug = $1 AND deleted_at IS NULL`,
		roleSlug,
	).Scan(&roleID)
	if err != nil {
		if err == pgx.ErrNoRows {
			return "", err
		}
		return "", err
	}

	_, err = tx.Exec(ctx,
		`INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)`,
		userID, roleID,
	)
	if err != nil {
		return "", err
	}

	if err := tx.Commit(ctx); err != nil {
		return "", err
	}

	return userID, nil
}