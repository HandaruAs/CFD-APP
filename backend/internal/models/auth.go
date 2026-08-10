package models

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type LoginResponse struct {
	Token string `json:"token"`
	User  struct {
		ID    string `json:"id"`
		Name  string `json:"name"`
		Email string `json:"email"`
	} `json:"user"`
}

// GoogleLoginRequest — ID token ini didapat frontend LANGSUNG dari Google
// (lewat Google Identity Services SDK di sisi browser/mobile), bukan
// dibuat sendiri oleh frontend. Backend cuma perlu memvalidasi token ini.
type GoogleLoginRequest struct {
	IDToken string `json:"id_token" binding:"required"`
}
