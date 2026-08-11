package models

// MenuItem — satu item menu, sudah termasuk children (submenu) kalau ada.
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