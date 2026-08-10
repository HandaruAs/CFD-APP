package oauth

import (
	"context"

	"google.golang.org/api/idtoken"
)

// GoogleClaims adalah data yang kita pakai dari ID token Google.
// Google ngasih lebih banyak field dari ini, tapi cuma 3 ini yang
// kita butuhin buat bikin/login akun.
type GoogleClaims struct {
	Sub   string // ID unik Google buat user ini, gak akan berubah
	Email string
	Name  string
}

// GoogleVerifier memvalidasi ID token yang dikirim frontend (hasil dari
// Google Identity Services SDK di sisi client). Validasi ini mengecek
// tanda tangan token ke server Google DAN mengecek token itu memang
// diterbitkan buat aplikasi kita (lewat Client ID), bukan aplikasi lain.
type GoogleVerifier struct {
	clientID string
}

func NewGoogleVerifier(clientID string) *GoogleVerifier {
	return &GoogleVerifier{clientID: clientID}
}

func (v *GoogleVerifier) Verify(ctx context.Context, idToken string) (*GoogleClaims, error) {
	payload, err := idtoken.Validate(ctx, idToken, v.clientID)
	if err != nil {
		return nil, err
	}

	claims := &GoogleClaims{Sub: payload.Subject}
	if email, ok := payload.Claims["email"].(string); ok {
		claims.Email = email
	}
	if name, ok := payload.Claims["name"].(string); ok {
		claims.Name = name
	}
	return claims, nil
}
