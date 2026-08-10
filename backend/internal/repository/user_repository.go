package repository

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type UserRepository struct {
	db *pgxpool.Pool
}

func NewUserRepository(db *pgxpool.Pool) *UserRepository {
	return &UserRepository{db: db}
}

func (r *UserRepository) RegisterPedagang(ctx context.Context, email, passwordHash, name, phone, nik, namaUsaha, jenisDagangan, alamat string) (string, error) {
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

	_, err = tx.Exec(ctx,
		`INSERT INTO pedagang_profiles (user_id, nik, nama_usaha, jenis_dagangan, alamat, status_verifikasi)
		 VALUES ($1, $2, $3, $4, $5, 'pending')`,
		userID, nik, namaUsaha, jenisDagangan, alamat,
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

type UserProfile struct {
	ID     string
	Name   string
	Email  string
	Status string
}

// GetByID dipakai endpoint /api/me — ambil data user dari user_id
// yang udah divalidasi AuthMiddleware lewat token JWT.
func (r *UserRepository) GetByID(ctx context.Context, id string) (*UserProfile, error) {
	var u UserProfile
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

// GetOrCreateByGoogle dipanggil setelah ID token Google berhasil divalidasi.
// Beda dari Opsi A: pencarian & penyimpanan identitas Google lewat tabel
// terpisah user_oauth_accounts, bukan kolom langsung di users. Ini bikin
// users tetap "netral" dari provider manapun, dan gampang nambah provider
// lain nanti tanpa ubah struktur users.
func (r *UserRepository) GetOrCreateByGoogle(ctx context.Context, googleID, email, name string) (string, error) {
	var userID string
	err := r.db.QueryRow(ctx,
		`SELECT user_id FROM user_oauth_accounts
		 WHERE provider = 'google' AND provider_user_id = $1 AND deleted_at IS NULL`,
		googleID,
	).Scan(&userID)
	if err == nil {
		return userID, nil // sudah pernah login sebelumnya
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return "", err
	}

	// belum pernah login -> bikin akun baru + link akun Google-nya
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return "", err
	}
	defer tx.Rollback(ctx)

	err = tx.QueryRow(ctx,
		`INSERT INTO users (email, name) VALUES ($1, $2) RETURNING id`,
		email, name,
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

	_, err = tx.Exec(ctx,
		`INSERT INTO user_oauth_accounts (user_id, provider, provider_user_id, email)
		 VALUES ($1, 'google', $2, $3)`,
		userID, googleID, email,
	)
	if err != nil {
		return "", err
	}

	if err := tx.Commit(ctx); err != nil {
		return "", err
	}

	return userID, nil
}
