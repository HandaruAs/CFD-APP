package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"math/big"
)

// GenerateResetToken dipakai buat reset-token (setelah OTP diverifikasi).
// Raw dikirim ke frontend, hash disimpan di DB.
func GenerateResetToken() (raw string, hash string, err error) {
	b := make([]byte, 32)
	if _, err = rand.Read(b); err != nil {
		return "", "", err
	}
	raw = hex.EncodeToString(b)
	hash = HashToken(raw)
	return raw, hash, nil
}

// GenerateOTP menghasilkan kode 6 digit (000000-999999) buat dikirim ke email,
// plus hash-nya buat disimpan di DB.
func GenerateOTP() (raw string, hash string, err error) {
	n, err := rand.Int(rand.Reader, big.NewInt(1000000))
	if err != nil {
		return "", "", err
	}
	raw = fmt.Sprintf("%06d", n.Int64())
	hash = HashToken(raw)
	return raw, hash, nil
}

// HashToken dipakai buat hash raw token/OTP dari request user, sebelum
// dicocokin ke hash yang tersimpan di DB.
func HashToken(raw string) string {
	sum := sha256.Sum256([]byte(raw))
	return hex.EncodeToString(sum[:])
}