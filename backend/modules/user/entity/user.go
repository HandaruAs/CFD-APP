package entity

import "time"

type User struct {
	ID        string    `db:"id"`
	Email     string    `db:"email"`
	Password  string    `db:"password"`
	Name      string    `db:"name"`
	Phone     string    `db:"phone"`
	Status    string    `db:"status"`
	CreatedAt time.Time `db:"created_at"`
	UpdatedAt time.Time `db:"updated_at"`
	DeletedAt *time.Time `db:"deleted_at"`
}

type UserProfile struct {
	ID     string
	Name   string
	Email  string
	Phone  string
	Status string
}

// UserManagementDTO dipakai buat list user role apapun (petugas, dll) di
// halaman Manajemen User -- field & JSON tag disamakan dengan tipe `User`
// di web/components/user-management-table.tsx.
type UserManagementDTO struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Email    string `json:"email"`
	Phone    string `json:"phone"`
	JoinedAt string `json:"joinedAt"`
	Active   bool   `json:"active"`
	Initial  string `json:"initial"`
}

// UserStats adalah ringkasan jumlah user per status, untuk 1 role tertentu.
// Field Status mengikuti enum user_status di DB: active, suspended, banned.
type UserStats struct {
	Total     int `json:"total"`
	Active    int `json:"active"`
	Suspended int `json:"suspended"`
	Banned    int `json:"banned"`
}