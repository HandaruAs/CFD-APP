package entity

import "errors"

// MenuItem — satu item menu buat konsumsi end-user (GET /api/menus),
// sudah termasuk children (submenu) kalau ada, disusun jadi tree.
type MenuItem struct {
	ID        string      `json:"id"`
	ParentID  *string     `json:"parent_id,omitempty"`
	Name      string      `json:"name"`
	Slug      string      `json:"slug"`
	Icon      *string     `json:"icon,omitempty"`
	Route     *string     `json:"route,omitempty"`
	SortOrder int         `json:"sort_order"`
	Children  []*MenuItem `json:"children"`
}

// AdminMenuItem — satu item menu buat listing di halaman menu management
// superadmin. Flat (bukan tree, biar gampang ditampilin di tabel), dan
// nunjukin role apa aja yang udah di-assign ke menu ini.
type AdminMenuItem struct {
	ID        string   `json:"id"`
	ParentID  *string  `json:"parent_id"`
	Name      string   `json:"name"`
	Slug      string   `json:"slug"`
	Icon      *string  `json:"icon,omitempty"`
	Route     *string  `json:"route,omitempty"`
	SortOrder int      `json:"sort_order"`
	IsActive  bool     `json:"is_active"`
	RoleSlugs []string `json:"role_slugs"`
}

// RoleOption — referensi role yang ringan, buat isi checkbox role-picker
// di form create/update menu.
type RoleOption struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Slug string `json:"slug"`
}

// MenuInput — payload buat create ATAU update menu, termasuk role mana
// aja yang boleh lihat menu ini. Di UpdateMenu, RoleSlugs ini REPLACE
// penuh assignment lama, bukan nambahin (cocok buat UI checkbox: centang
// sesuka hati, submit, sistem yang nyesuain).
type MenuInput struct {
	Name      string
	Slug      string
	Icon      *string
	Route     *string
	ParentID  *string
	SortOrder int
	RoleSlugs []string
}

// ErrMenuHasChildren dikembalikan pas mau delete menu yang masih punya
// submenu aktif -- soft delete gak cascade ke children, jadi ini dicegah
// dulu di level repository biar gak ada submenu yang jadi "yatim".
var ErrMenuHasChildren = errors.New("menu ini masih punya submenu aktif, hapus submenu-nya dulu")