package controller

import (
	"cfd-backend/modules/petugas/sisa-lapak/entity"
	"cfd-backend/modules/petugas/sisa-lapak/usecase"
	"github.com/gofiber/fiber/v3"
)

type Controller struct {
	usecase *usecase.Usecase
}

func NewController(usecase *usecase.Usecase) *Controller {
	return &Controller{usecase: usecase}
}

// GetSisaLapak - GET /api/petugas/sisa-lapak
func (c *Controller) GetSisaLapak(ctx fiber.Ctx) error {
	data, err := c.usecase.GetSisaLapak(ctx.Context())
	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "gagal mengambil data sisa lapak: " + err.Error(),
		})
	}
	return ctx.Status(fiber.StatusOK).JSON(data)
}

// CreateJalan - POST /api/petugas/sisa-lapak
func (c *Controller) CreateJalan(ctx fiber.Ctx) error {
	var req entity.CreateJalanRequest
	if err := ctx.Bind().Body(&req); err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "format request tidak valid: " + err.Error(),
		})
	}
	if err := c.usecase.CreateJalan(ctx.Context(), &req); err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}
	return ctx.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "jalan berhasil ditambahkan",
	})
}

// UpdateJalan - PUT /api/petugas/sisa-lapak/:id
func (c *Controller) UpdateJalan(ctx fiber.Ctx) error {
	id := ctx.Params("id")
	var req entity.UpdateJalanRequest
	if err := ctx.Bind().Body(&req); err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "format request tidak valid: " + err.Error(),
		})
	}
	if err := c.usecase.UpdateJalan(ctx.Context(), id, &req); err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}
	return ctx.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "jalan berhasil diupdate",
	})
}

// DeleteJalan - DELETE /api/petugas/sisa-lapak/:id
func (c *Controller) DeleteJalan(ctx fiber.Ctx) error {
	id := ctx.Params("id")
	if err := c.usecase.DeleteJalan(ctx.Context(), id); err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}
	return ctx.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "jalan berhasil dihapus",
	})
}

// GetInstansi - GET /api/petugas/sisa-lapak/instansi
func (c *Controller) GetInstansi(ctx fiber.Ctx) error {
	data, err := c.usecase.GetAllInstansi(ctx.Context())
	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "gagal mengambil data instansi: " + err.Error(),
		})
	}
	return ctx.Status(fiber.StatusOK).JSON(data)
}