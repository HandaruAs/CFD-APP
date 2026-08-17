package repository

import (
	"context"

	"cfd-backend/modules/user/entity" 

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
func (r *UserRepository) GetByID(ctx context.Context, id string) (*entity.UserProfile, error) { // <-- Return type berubah
	var u entity.UserProfile // <-- Tipe variabel berubah
	err := r.db.QueryRow(ctx,
		`SELECT id, name, email, status
		 FROM users
		 WHERE id = $1 AND deleted_at IS NULL`,
		id,
	).Scan(&u.ID, &u.Name, &u.Email, &u.Status)
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

func (r *UserRepository) RegisterPedagangByAdmin(ctx context.Context, email, passwordHash, name, phone string) (string, error) {
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