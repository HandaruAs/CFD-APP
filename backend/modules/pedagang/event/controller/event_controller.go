package controller

import (
	"errors"
	"log"

	"cfd-backend/modules/pedagang/event/entity"
	"cfd-backend/modules/pedagang/event/repository"
	"cfd-backend/modules/pedagang/event/usecase"
	"cfd-backend/modules/shared/eventaturan"

	"github.com/gofiber/fiber/v3"
)

type EventController struct {
	usecase usecase.EventUsecase
}

func NewEventController(uc usecase.EventUsecase) *EventController {
	return &EventController{usecase: uc}
}

func mapError(c fiber.Ctx, err error) error {
	var bentrok *repository.ErrJadwalBentrok
	var belumCheckout *repository.ErrBelumCheckout
	switch {
	case errors.As(err, &belumCheckout):
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": belumCheckout.Error(), "code": "BELUM_CHECKOUT"})
	case errors.Is(err, repository.ErrBelumCheckIn):
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": err.Error(), "code": "BELUM_CHECK_IN"})
	case errors.Is(err, repository.ErrSudahCheckout):
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": err.Error(), "code": "SUDAH_CHECKOUT"})
	case errors.Is(err, repository.ErrEventBelumSelesai):
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": err.Error(), "code": "EVENT_BELUM_SELESAI"})
	case errors.Is(err, repository.ErrOmsetTidakValid):
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error(), "code": "OMSET_TIDAK_VALID"})
	case errors.As(err, &bentrok):
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": bentrok.Error(), "code": "JADWAL_BENTROK"})
	case errors.Is(err, repository.ErrBelumPunyaProfil):
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": err.Error(), "code": "BELUM_PUNYA_PROFIL"})
	case errors.Is(err, repository.ErrEventTidakDitemukan),
		errors.Is(err, repository.ErrKeikutsertaanNotFound),
		eventaturan.IsInvalidUUID(err):
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "event tidak ditemukan"})
	case errors.Is(err, repository.ErrBelumIkut):
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": err.Error()})
	case errors.Is(err, repository.ErrPendaftaranBelumBuka):
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": err.Error(), "code": "PENDAFTARAN_BELUM_BUKA"})
	case errors.Is(err, repository.ErrPendaftaranDitutup):
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": err.Error(), "code": "PENDAFTARAN_DITUTUP"})
	case errors.Is(err, repository.ErrSudahIkut):
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": err.Error(), "code": "SUDAH_IKUT"})
	case errors.Is(err, repository.ErrSudahBatal):
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": err.Error(), "code": "SUDAH_BATAL"})
	case errors.Is(err, repository.ErrKuotaPenuh):
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": err.Error(), "code": "KUOTA_PENUH"})
	case errors.Is(err, repository.ErrTidakBisaBatal):
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": err.Error(), "code": "TIDAK_BISA_BATAL"})
	default:
		log.Println("[pedagang/event] error:", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "terjadi kesalahan pada server"})
	}
}

func userID(c fiber.Ctx) (string, bool) {
	id, ok := c.Locals("user_id").(string)
	return id, ok && id != ""
}

// ListEvent - GET /api/pedagang/events
// Event yang bisa dipilih + sisa kuota sesuai kategori pedagang (lama/baru).
func (ctrl *EventController) ListEvent(c fiber.Ctx) error {
	uid, ok := userID(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}
	res, err := ctrl.usecase.ListEventTersedia(c.Context(), uid)
	if err != nil {
		return mapError(c, err)
	}
	return c.JSON(fiber.Map{"data": res})
}

// Ikut - POST /api/pedagang/events/:id/ikut
// Lokasi (ruas) dan nomor stand diacak server, hasilnya langsung terkunci.
func (ctrl *EventController) Ikut(c fiber.Ctx) error {
	uid, ok := userID(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}
	k, err := ctrl.usecase.Ikut(c.Context(), uid, c.Params("id"))
	if err != nil {
		return mapError(c, err)
	}
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"message": "berhasil ikut event", "data": k})
}

// Batal - DELETE /api/pedagang/events/:id/ikut
func (ctrl *EventController) Batal(c fiber.Ctx) error {
	uid, ok := userID(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}
	if err := ctrl.usecase.Batal(c.Context(), uid, c.Params("id")); err != nil {
		return mapError(c, err)
	}
	return c.JSON(fiber.Map{"message": "pendaftaran event dibatalkan"})
}

// ListSaya - GET /api/pedagang/events/saya
// Kartu event yang diikuti (untuk halaman Check-in/out).
func (ctrl *EventController) ListSaya(c fiber.Ctx) error {
	uid, ok := userID(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}
	list, err := ctrl.usecase.ListSaya(c.Context(), uid)
	if err != nil {
		return mapError(c, err)
	}
	return c.JSON(fiber.Map{"data": list})
}

// DataCheckout - GET /api/pedagang/events/checkout
// data: event yang perlu di-checkout (atau checkout terakhir hari ini),
// atau null kalau tidak ada.
func (ctrl *EventController) DataCheckout(c fiber.Ctx) error {
	uid, ok := userID(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}
	d, err := ctrl.usecase.DataCheckout(c.Context(), uid)
	if err != nil {
		return mapError(c, err)
	}
	return c.JSON(fiber.Map{"data": d})
}

// Checkout - POST /api/pedagang/events/:id/checkout
// body: {"omset": 250000}
func (ctrl *EventController) Checkout(c fiber.Ctx) error {
	uid, ok := userID(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}
	var req entity.CheckoutRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "format request tidak valid"})
	}
	d, err := ctrl.usecase.Checkout(c.Context(), uid, c.Params("id"), req.Omset)
	if err != nil {
		return mapError(c, err)
	}
	return c.JSON(fiber.Map{"message": "checkout berhasil, terima kasih sudah berjualan", "data": d})
}