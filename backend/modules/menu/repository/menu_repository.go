package repository

import (
	"context"

	"cfd-backend/modules/menu/entity"

	"github.com/jackc/pgx/v5"
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
// berdasarkan parent_id.
//
// pedagangStage cuma relevan buat role "pedagang" (nilai "unverified"
// atau "verified"); untuk role lain kirim nil aja.
func (r *MenuRepository) GetMenusByRoleSlug(ctx context.Context, roleSlug string, pedagangStage *string) ([]*entity.MenuItem, error) {
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

	byID := make(map[string]*entity.MenuItem)
	var order []string

	for rows.Next() {
		var m menuRow
		if err := rows.Scan(&m.ID, &m.ParentID, &m.Name, &m.Slug, &m.Icon, &m.Route, &m.SortOrder); err != nil {
			return nil, err
		}
		byID[m.ID] = &entity.MenuItem{
			ID:        m.ID,
			ParentID:  m.ParentID,
			Name:      m.Name,
			Slug:      m.Slug,
			Icon:      m.Icon,
			Route:     m.Route,
			SortOrder: m.SortOrder,
			Children:  []*entity.MenuItem{},
		}
		order = append(order, m.ID)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	var roots []*entity.MenuItem
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

// ListAllMenus ambil SEMUA menu (flat, bukan tree) beserta role slug apa
// aja yang udah di-assign ke tiap menu -- buat tabel menu management.
func (r *MenuRepository) ListAllMenus(ctx context.Context) ([]*entity.AdminMenuItem, error) {
	rows, err := r.db.Query(ctx, `
		SELECT
			m.id, m.parent_id, m.name, m.slug, m.icon, m.route, m.sort_order, m.is_active,
			COALESCE(array_agg(ro.slug) FILTER (WHERE ro.slug IS NOT NULL), '{}')
		FROM menus m
		LEFT JOIN menu_roles mr ON mr.menu_id = m.id AND mr.deleted_at IS NULL
		LEFT JOIN roles ro ON ro.id = mr.role_id AND ro.deleted_at IS NULL
		WHERE m.deleted_at IS NULL
		GROUP BY m.id
		ORDER BY m.sort_order ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]*entity.AdminMenuItem, 0)
	for rows.Next() {
		var m entity.AdminMenuItem
		if err := rows.Scan(
			&m.ID, &m.ParentID, &m.Name, &m.Slug, &m.Icon, &m.Route,
			&m.SortOrder, &m.IsActive, &m.RoleSlugs,
		); err != nil {
			return nil, err
		}
		items = append(items, &m)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	return items, nil
}

// CreateMenu insert 1 menu baru + assign ke role-role yang dipilih,
// dalam 1 transaksi.
func (r *MenuRepository) CreateMenu(ctx context.Context, in entity.MenuInput) (string, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return "", err
	}
	defer tx.Rollback(ctx)

	var menuID string
	err = tx.QueryRow(ctx,
		`INSERT INTO menus (parent_id, name, slug, icon, route, sort_order)
		 VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
		in.ParentID, in.Name, in.Slug, in.Icon, in.Route, in.SortOrder,
	).Scan(&menuID)
	if err != nil {
		return "", err
	}

	if err := attachRoles(ctx, tx, menuID, in.RoleSlugs); err != nil {
		return "", err
	}

	if err := tx.Commit(ctx); err != nil {
		return "", err
	}

	return menuID, nil
}

// UpdateMenu update data menu + REPLACE penuh role assignment-nya
// (role lama di-soft-delete, role baru di-insert), dalam 1 transaksi.
func (r *MenuRepository) UpdateMenu(ctx context.Context, id string, in entity.MenuInput) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	cmdTag, err := tx.Exec(ctx,
		`UPDATE menus
		 SET parent_id = $1, name = $2, slug = $3, icon = $4, route = $5,
		     sort_order = $6, updated_at = now()
		 WHERE id = $7 AND deleted_at IS NULL`,
		in.ParentID, in.Name, in.Slug, in.Icon, in.Route, in.SortOrder, id,
	)
	if err != nil {
		return err
	}
	if cmdTag.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}

	_, err = tx.Exec(ctx,
		`UPDATE menu_roles SET deleted_at = now() WHERE menu_id = $1 AND deleted_at IS NULL`,
		id,
	)
	if err != nil {
		return err
	}

	if err := attachRoles(ctx, tx, id, in.RoleSlugs); err != nil {
		return err
	}

	return tx.Commit(ctx)
}

// DeleteMenu soft delete 1 menu (+ role assignment-nya). Ditolak kalau
// menu ini masih punya submenu aktif, biar submenu gak jadi "yatim"
// (soft delete gak cascade ke children secara otomatis).
func (r *MenuRepository) DeleteMenu(ctx context.Context, id string) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	var childCount int
	err = tx.QueryRow(ctx,
		`SELECT COUNT(*) FROM menus WHERE parent_id = $1 AND deleted_at IS NULL`,
		id,
	).Scan(&childCount)
	if err != nil {
		return err
	}
	if childCount > 0 {
		return entity.ErrMenuHasChildren
	}

	cmdTag, err := tx.Exec(ctx,
		`UPDATE menus SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL`,
		id,
	)
	if err != nil {
		return err
	}
	if cmdTag.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}

	_, err = tx.Exec(ctx,
		`UPDATE menu_roles SET deleted_at = now() WHERE menu_id = $1 AND deleted_at IS NULL`,
		id,
	)
	if err != nil {
		return err
	}

	return tx.Commit(ctx)
}

// ListRoles ambil semua role, buat isi checkbox role-picker di form.
func (r *MenuRepository) ListRoles(ctx context.Context) ([]entity.RoleOption, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, name, slug FROM roles WHERE deleted_at IS NULL ORDER BY name ASC`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	roles := make([]entity.RoleOption, 0)
	for rows.Next() {
		var ro entity.RoleOption
		if err := rows.Scan(&ro.ID, &ro.Name, &ro.Slug); err != nil {
			return nil, err
		}
		roles = append(roles, ro)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	return roles, nil
}

// attachRoles insert menu_roles buat 1 menu ke semua role slug yang
// dikasih. Helper internal dipakai CreateMenu & UpdateMenu.
func attachRoles(ctx context.Context, tx pgx.Tx, menuID string, roleSlugs []string) error {
	for _, slug := range roleSlugs {
		var roleID string
		err := tx.QueryRow(ctx,
			`SELECT id FROM roles WHERE slug = $1 AND deleted_at IS NULL`,
			slug,
		).Scan(&roleID)
		if err != nil {
			return err
		}

		_, err = tx.Exec(ctx,
			`INSERT INTO menu_roles (menu_id, role_id) VALUES ($1, $2)
			 ON CONFLICT (menu_id, role_id) WHERE deleted_at IS NULL DO NOTHING`,
			menuID, roleID,
		)
		if err != nil {
			return err
		}
	}
	return nil
}