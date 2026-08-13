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
	Status string
}