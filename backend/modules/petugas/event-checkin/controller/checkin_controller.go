package controller

import (
	"errors"
	"log"

	"cfd-backend/modules/petugas/event-checkin/entity"
	"cfd-backend/modules/petugas/event-checkin/repository"
	"cfd-backend/modules/petugas/event-checkin/usecase"

	"github.com/gofiber/fiber/v3"
)

type CheckInController struct {
	usecase usecase.CheckInUsecase
}

func NewCheckInController(uc usecase.CheckInUsecase) *CheckInController {
	return &CheckInController{usecase: uc}
}

func mapError(c fiber.Ctx, err error) error {
	var alasan *repository.ErrAlasan
	var masih *repository.ErrMasihCheckIn
	var belumCheckout *repository.ErrBelumCheckout
	switch {
	case errors.Is(err, repository.ErrPesertaTidakDitemukan):
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "QR tidak dikenali atau pendaftaran tidak ditemukan", "code": "QR_TIDAK_DIKENALI"})
	case errors.Is(err, usecase.ErrTidakAdaEventHariIni):
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": err.Error(), "code": "TIDAK_ADA_EVENT"})
	case errors.Is(err, usecase.ErrPilihKartu):
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": err.Error(), "code": "PILIH_KARTU_EVENT"})
	case errors.As(err, &belumCheckout):
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": belumCheckout.Error(), "code": "BELUM_CHECKOUT"})
	case errors.As(err, &masih):
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": masih.Error(), "code": "MASIH_CHECK_IN"})
	case errors.As(err, &alasan):
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": alasan.Alasan, "code": "TIDAK_BISA_CHECK_IN"})
	default:
		log.Println("[petugas/event-checkin] error:", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "terjadi kesalahan pada server"})
	}
}

// Periksa - POST /api/petugas/event-checkin/periksa
// body: {"qrCode": "<id keikutsertaan / id pedagang>"}
// Hanya membaca: menampilkan pedagang, event, lapak, dan boleh/tidaknya check-in.
func (ctrl *CheckInController) Periksa(c fiber.Ctx) error {
	var req entity.PeriksaRequest
	if err := c.Bind().Body(&req); err != nil || req.QRCode == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "qrCode wajib diisi"})
	}
	p, err := ctrl.usecase.Periksa(c.Context(), req.QRCode)
	if err != nil {
		return mapError(c, err)
	}
	return c.JSON(fiber.Map{"data": p})
}

// CheckIn - POST /api/petugas/event-checkin
// body: {"pesertaId": "...", "catatan": "opsional"}
func (ctrl *CheckInController) CheckIn(c fiber.Ctx) error {
	petugasID, ok := c.Locals("user_id").(string)
	if !ok || petugasID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}
	var req entity.CheckInRequest
	if err := c.Bind().Body(&req); err != nil || req.PesertaID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "pesertaId wajib diisi"})
	}
	p, err := ctrl.usecase.CheckIn(c.Context(), petugasID, &req)
	if err != nil {
		return mapError(c, err)
	}
	return c.JSON(fiber.Map{"message": "check-in berhasil", "data": p})
}

// Riwayat - GET /api/petugas/event-checkin/riwayat
// Check-in yang dilakukan petugas ini hari ini.
func (ctrl *CheckInController) Riwayat(c fiber.Ctx) error {
	petugasID, ok := c.Locals("user_id").(string)
	if !ok || petugasID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}
	list, err := ctrl.usecase.Riwayat(c.Context(), petugasID)
	if err != nil {
		return mapError(c, err)
	}
	return c.JSON(fiber.Map{"data": list})
}