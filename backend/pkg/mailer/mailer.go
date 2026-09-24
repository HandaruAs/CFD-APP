package mailer

import (
	"context"
	"fmt"
	"net/smtp"
)

// Mailer adalah interface, jadi usecase gak bergantung ke SMTP secara
// langsung -- gampang di-mock waktu testing.
type Mailer interface {
	SendPasswordResetOTP(ctx context.Context, toEmail, otp string) error
}

type smtpMailer struct {
	host     string
	port     string
	username string
	password string
	from     string
}

func NewSMTPMailer(host, port, username, password, from string) Mailer {
	return &smtpMailer{host: host, port: port, username: username, password: password, from: from}
}

func (m *smtpMailer) SendPasswordResetOTP(ctx context.Context, toEmail, otp string) error {
	subject := "Kode OTP Reset Password CFD-APP"
	body := fmt.Sprintf(
		"Halo,\r\n\r\nKode OTP untuk reset password akun kamu:\r\n\r\n%s\r\n\r\n"+
			"Kode ini berlaku 10 menit. Kalau kamu tidak meminta ini, abaikan email ini.\r\n",
		otp,
	)

	msg := []byte("From: " + m.from + "\r\n" +
		"To: " + toEmail + "\r\n" +
		"Subject: " + subject + "\r\n\r\n" +
		body)

	auth := smtp.PlainAuth("", m.username, m.password, m.host)
	addr := m.host + ":" + m.port

	return smtp.SendMail(addr, auth, m.from, []string{toEmail}, msg)
}
