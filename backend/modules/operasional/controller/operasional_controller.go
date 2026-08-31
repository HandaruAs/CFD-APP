package controller

import (
	"errors"
	"log"

	"cfd-backend/modules/operasional/entity"
	"cfd-backend/modules/operasional/usecase"

	"github.com/gofiber/fiber/v3"
)

type OperasionalController struct {
	operasionalUsecase usecase.OperasionalUsecase
}

func NewOperasionalController(operasionalUsecase usecase.OperasionalUsecase) *OperasionalController {
	return &OperasionalController{operasionalUsecase: operasionalUsecase}
}

func getUserID(c fiber.Ctx) (string, error) {
	userID, exists := c.Locals("user_id").(string)
	if !exists || userID == "" {
		return "", errors.New("user tidak terautentikasi")
	}
	return userID, nil
}

func (ctrl *OperasionalController) GetStatusOperasional(c fiber.Ctx) error {
	status, err := ctrl.operasionalUsecase.GetStatusOperasional(c.Context())
	if err != nil {
		log.Printf("DEBUG GetStatusOperasional error: %v", err) // ← tambahin ini
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "gagal mengambil status operasional",
		})
	}
	return c.Status(fiber.StatusOK).JSON(status)
}

func (ctrl *OperasionalController) SimpanSesi(c fiber.Ctx) error {
	var req entity.UpdateSesiRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	userID, err := getUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	sesi, err := ctrl.operasionalUsecase.SimpanSesi(c.Context(), userID, &req)
	if err != nil {
		status := fiber.StatusBadRequest
		if errors.Is(err, usecase.ErrSesiSudahDiatur) {
			status = fiber.StatusConflict
		}
		return c.Status(status).JSON(fiber.Map{
			"error": err.Error(),
		})
	}
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "jam sesi berhasil disimpan",
		"sesi":    sesi,
	})
}

func (ctrl *OperasionalController) BukaSesiManual(c fiber.Ctx) error {
	userID, err := getUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	sesi, err := ctrl.operasionalUsecase.BukaSesiManual(c.Context(), userID)
	if err != nil {
		status := fiber.StatusBadRequest
		if errors.Is(err, usecase.ErrSesiSudahDiatur) {
			status = fiber.StatusConflict
		}
		return c.Status(status).JSON(fiber.Map{
			"error": err.Error(),
		})
	}
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "sesi CFD berhasil dibuka",
		"sesi":    sesi,
	})
}

func (ctrl *OperasionalController) AkhiriSesiLebihAwal(c fiber.Ctx) error {
	sesi, err := ctrl.operasionalUsecase.AkhiriSesiLebihAwal(c.Context())
	if err != nil {
		if errors.Is(err, usecase.ErrSesiTidakBisaDiakhiri) {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{
				"error": err.Error(),
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "gagal mengakhiri sesi",
		})
	}
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "sesi CFD berhasil diakhiri lebih awal",
		"sesi":    sesi,
	})
}

func (ctrl *OperasionalController) UpdatePendaftaran(c fiber.Ctx) error {
	var req entity.UpdatePendaftaranRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	userID, err := getUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	if err := ctrl.operasionalUsecase.UpdatePendaftaran(c.Context(), userID, &req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "pengaturan pendaftaran berhasil diperbarui",
	})
}

func (ctrl *OperasionalController) GetJadwalMingguan(c fiber.Ctx) error {
	list, err := ctrl.operasionalUsecase.ListJadwalMingguan(c.Context())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "gagal mengambil jadwal mingguan",
		})
	}
	return c.Status(fiber.StatusOK).JSON(fiber.Map{"jadwal": list})
}

func (ctrl *OperasionalController) UpdateJadwalMingguan(c fiber.Ctx) error {
	var req entity.UpdateJadwalMingguanRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	userID, err := getUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	jadwal, err := ctrl.operasionalUsecase.UpdateJadwalMingguan(c.Context(), userID, &req)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "gagal menyimpan jadwal mingguan: " + err.Error(),
		})
	}
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "jadwal mingguan berhasil disimpan",
		"jadwal":  jadwal,
	})
}