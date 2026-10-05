package controller

import (
	"errors"
	"log"

	"cfd-backend/modules/admin/event/entity"
	"cfd-backend/modules/admin/event/repository"
	"cfd-backend/modules/admin/event/usecase"
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
	var ve *usecase.ValidationError
	var kurang *usecase.ErrKapasitasKurang
	switch {
	case errors.As(err, &kurang):
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": kurang.Error(), "code": "KAPASITAS_KURANG"})
	case errors.As(err, &ve):
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": ve.Pesan})
	case errors.Is(err, repository.ErrEventTidakDitemukan),
		errors.Is(err, repository.ErrLapakTidakDitemukan),
		errors.Is(err, repository.ErrWilayahTidakDitemukan),
		eventaturan.IsInvalidUUID(err):
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": err.Error()})
	case errors.Is(err, repository.ErrScopeTidakValid),
		errors.Is(err, repository.ErrWilayahWajibDiisi),
		errors.Is(err, usecase.ErrAksiTidakValid):
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	case errors.Is(err, repository.ErrStatusTidakSesuai),
		errors.Is(err, repository.ErrTidakAdaKandidat),
		errors.Is(err, repository.ErrSudahAdaLokasi),
		errors.Is(err, usecase.ErrBelumAdaTitik),
		errors.Is(err, usecase.ErrBukanHariH),
		errors.Is(err, usecase.ErrJadwalTerkunci),
		errors.Is(err, usecase.ErrKuotaTurun),
		errors.Is(err, usecase.ErrKuotaDiBawahTerisi),
		errors.Is(err, usecase.ErrKuotaBelumDiisi),
		errors.Is(err, usecase.ErrKapasitasDiBawahIsi),
		errors.Is(err, usecase.ErrKuotaTerkunci),
		errors.Is(err, usecase.ErrLapakMasihDipakai),
		errors.Is(err, usecase.ErrEventMasihAdaPeserta):
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": err.Error()})
	default:
		log.Println("[admin/event] error:", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "terjadi kesalahan pada server"})
	}
}

func actor(c fiber.Ctx) (string, bool) {
	id, ok := c.Locals("user_id").(string)
	return id, ok && id != ""
}

// ListEvents - GET /api/admin/events?tanggal=YYYY-MM-DD
func (ctrl *EventController) ListEvents(c fiber.Ctx) error {
	var tanggal *string
	if t := c.Query("tanggal"); t != "" {
		tanggal = &t
	}
	list, err := ctrl.usecase.ListEvents(c.Context(), tanggal)
	if err != nil {
		return mapError(c, err)
	}
	return c.JSON(fiber.Map{"data": list})
}

// GetEvent - GET /api/admin/events/:id (event + titik lokasi + kuota)
func (ctrl *EventController) GetEvent(c fiber.Ctx) error {
	ev, err := ctrl.usecase.GetEvent(c.Context(), c.Params("id"))
	if err != nil {
		return mapError(c, err)
	}
	return c.JSON(fiber.Map{"data": ev})
}

// CreateEvent - POST /api/admin/events (event baru berstatus draft)
func (ctrl *EventController) CreateEvent(c fiber.Ctx) error {
	userID, ok := actor(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}
	var req entity.EventRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "format request tidak valid"})
	}
	ev, err := ctrl.usecase.CreateEvent(c.Context(), userID, &req)
	if err != nil {
		return mapError(c, err)
	}
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"message": "event berhasil dibuat", "data": ev})
}

// UpdateEvent - PUT /api/admin/events/:id
func (ctrl *EventController) UpdateEvent(c fiber.Ctx) error {
	userID, ok := actor(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}
	var req entity.EventRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "format request tidak valid"})
	}
	ev, err := ctrl.usecase.UpdateEvent(c.Context(), userID, c.Params("id"), &req)
	if err != nil {
		return mapError(c, err)
	}
	return c.JSON(fiber.Map{"message": "event berhasil diperbarui", "data": ev})
}

// UbahStatus - PATCH /api/admin/events/:id/status
// body: {"aksi": "terbitkan|mulai|perpanjang|akhiri|batalkan", "jamSelesai": "12:00", "alasan": "..."}
func (ctrl *EventController) UbahStatus(c fiber.Ctx) error {
	userID, ok := actor(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}
	var req entity.UbahStatusRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "format request tidak valid"})
	}
	ev, err := ctrl.usecase.UbahStatus(c.Context(), userID, c.Params("id"), &req)
	if err != nil {
		return mapError(c, err)
	}
	return c.JSON(fiber.Map{"message": "status event berhasil diubah", "data": ev})
}

// DeleteEvent - DELETE /api/admin/events/:id
func (ctrl *EventController) DeleteEvent(c fiber.Ctx) error {
	userID, ok := actor(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}
	if err := ctrl.usecase.DeleteEvent(c.Context(), userID, c.Params("id")); err != nil {
		return mapError(c, err)
	}
	return c.JSON(fiber.Map{"message": "event berhasil dihapus"})
}

// AcakLokasi - POST /api/admin/events/:id/acak-lokasi
// body: {"scope": "kota|kecamatan|jalan|ruas", "kecamatanIds": [...], "jalanIds": [...],
//
//	"ruasIds": [...], "jumlahTitik": 3}
func (ctrl *EventController) AcakLokasi(c fiber.Ctx) error {
	userID, ok := actor(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}
	var req entity.AcakLokasiRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "format request tidak valid"})
	}
	res, err := ctrl.usecase.AcakLokasi(c.Context(), userID, c.Params("id"), &req)
	if err != nil {
		return mapError(c, err)
	}
	return c.JSON(fiber.Map{"message": "lokasi berhasil diacak", "data": res})
}

// UpdateKapasitas - PATCH /api/admin/events/:id/lapak/:lapakId
// body: {"kapasitas": 12}
func (ctrl *EventController) UpdateKapasitas(c fiber.Ctx) error {
	userID, ok := actor(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}
	var req entity.UpdateKapasitasRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "format request tidak valid"})
	}
	l, err := ctrl.usecase.UpdateKapasitas(c.Context(), userID, c.Params("id"), c.Params("lapakId"), &req)
	if err != nil {
		return mapError(c, err)
	}
	return c.JSON(fiber.Map{"message": "kapasitas titik berhasil diperbarui", "data": l})
}

// DeleteLapak - DELETE /api/admin/events/:id/lapak/:lapakId
func (ctrl *EventController) DeleteLapak(c fiber.Ctx) error {
	userID, ok := actor(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}
	if err := ctrl.usecase.DeleteLapak(c.Context(), userID, c.Params("id"), c.Params("lapakId")); err != nil {
		return mapError(c, err)
	}
	return c.JSON(fiber.Map{"message": "titik lokasi berhasil dihapus"})
}

// ListPeserta - GET /api/admin/events/:id/peserta
func (ctrl *EventController) ListPeserta(c fiber.Ctx) error {
	list, err := ctrl.usecase.ListPeserta(c.Context(), c.Params("id"))
	if err != nil {
		return mapError(c, err)
	}
	return c.JSON(fiber.Map{"data": list})
}