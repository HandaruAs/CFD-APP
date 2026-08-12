package repository

import (
	"context"

	"cfd-backend/internal/models"

	"github.com/jackc/pgx/v5/pgxpool"
)

type MenuRepository struct {
	db *pgxpool.Pool
}

func NewMenuRepository(db *pgxpool.Pool) *MenuRepository {
	return &MenuRepository{db: db}
}

type menuRow struct {
	ID        string
	ParentID  *string
	Name      string
	Slug      string
	Icon      *string
	Route     *string
	SortOrder int
}

// GetMenusByRoleSlug mengambil semua menu yang boleh dilihat role
// tertentu (lewat tabel menu_roles), lalu disusun jadi tree
// berdasarkan parent_id -- jadi menu yang punya submenu otomatis
// ke-nest, gak perlu disusun manual di frontend.
//
// pedagangStage cuma relevan buat role "pedagang" (nilai "unverified"
// atau "verified"); untuk role lain kirim nil aja -- query bakal tetap
// ambil semua menu yang pedagang_stage-nya NULL (menu non-pedagang).
func (r *MenuRepository) GetMenusByRoleSlug(ctx context.Context, roleSlug string, pedagangStage *string) ([]*models.MenuItem, error) {
	rows, err := r.db.Query(ctx, `
		SELECT m.id, m.parent_id, m.name, m.slug, m.icon, m.route, m.sort_order
		FROM menus m
		JOIN menu_roles mr ON mr.menu_id = m.id AND mr.deleted_at IS NULL
		JOIN roles r ON r.id = mr.role_id AND r.deleted_at IS NULL
		WHERE r.slug = $1
		  AND m.is_active = true
		  AND m.deleted_at IS NULL
		  AND (m.pedagang_stage IS NULL OR m.pedagang_stage = $2)
		ORDER BY m.sort_order ASC
	`, roleSlug, pedagangStage)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	byID := make(map[string]*models.MenuItem)
	var order []string

	for rows.Next() {
		var m menuRow
		if err := rows.Scan(&m.ID, &m.ParentID, &m.Name, &m.Slug, &m.Icon, &m.Route, &m.SortOrder); err != nil {
			return nil, err
		}
		byID[m.ID] = &models.MenuItem{
			ID:        m.ID,
			ParentID:  m.ParentID,
			Name:      m.Name,
			Slug:      m.Slug,
			Icon:      m.Icon,
			Route:     m.Route,
			SortOrder: m.SortOrder,
			Children:  []*models.MenuItem{},
		}
		order = append(order, m.ID)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	var roots []*models.MenuItem
	for _, id := range order {
		item := byID[id]
		if item.ParentID == nil {
			roots = append(roots, item)
			continue
		}
		parent, ok := byID[*item.ParentID]
		if !ok {
			// parent-nya kebetulan gak ke-assign ke role yang sama ->
			// tampilkan aja sebagai root, daripada hilang gak kelihatan
			roots = append(roots, item)
			continue
		}
		parent.Children = append(parent.Children, item)
	}

	return roots, nil
}