package controller

import (
    "cfd-backend/modules/petugas/scan-qr/entity"
    "cfd-backend/modules/petugas/scan-qr/usecase"
    "github.com/gofiber/fiber/v3"
)

type ScanController struct {
    scanUsecase usecase.ScanUsecase
}

func NewScanController(scanUsecase usecase.ScanUsecase) *ScanController {
    return &ScanController{scanUsecase: scanUsecase}
}

// VerifyQR - POST /api/petugas/scan
func (c *ScanController) VerifyQR(ctx fiber.Ctx) error {
    var req entity.VerifyQRRequest
    if err := ctx.Bind().Body(&req); err != nil {
        return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
            "error": "format request tidak valid",
        })
    }

    if req.QRCode == "" {
        return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
            "error": "qr_code wajib diisi",
        })
    }

    petugasID, ok := ctx.Locals("user_id").(string)
    if !ok {
        return ctx.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
            "error": "unauthorized",
        })
    }

    resp, err := c.scanUsecase.VerifyQRCode(ctx.Context(), req.QRCode, petugasID)
    if err != nil {
        return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
            "error": err.Error(),
        })
    }

    return ctx.Status(fiber.StatusOK).JSON(resp)
}

// CheckIn - POST /api/petugas/check-in
func (c *ScanController) CheckIn(ctx fiber.Ctx) error {
    var req entity.CheckInRequest
    if err := ctx.Bind().Body(&req); err != nil {
        return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
            "error": "format request tidak valid",
        })
    }

    if req.PedagangID == "" {
        return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
            "error": "pedagang_id wajib diisi",
        })
    }

    petugasID, ok := ctx.Locals("user_id").(string)
    if !ok {
        return ctx.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
            "error": "unauthorized",
        })
    }

    resp, err := c.scanUsecase.CheckInPedagang(ctx.Context(), req.PedagangID, petugasID, req.Catatan)
    if err != nil {
        return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{
            "error": err.Error(),
        })
    }

    return ctx.Status(fiber.StatusOK).JSON(resp)
}

// GetRiwayatScan - GET /api/petugas/riwayat-scan
func (c *ScanController) GetRiwayatScan(ctx fiber.Ctx) error {
    petugasID, ok := ctx.Locals("user_id").(string)
    if !ok {
        return ctx.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
            "error": "unauthorized",
        })
    }

    resp, err := c.scanUsecase.GetRiwayatScan(ctx.Context(), petugasID)
    if err != nil {
        return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
            "error": err.Error(),
        })
    }

    return ctx.Status(fiber.StatusOK).JSON(resp)
}

// GetStatusCheckIn - GET /api/pedagang/check-in/status
func (c *ScanController) GetStatusCheckIn(ctx fiber.Ctx) error {
	userID, ok := ctx.Locals("user_id").(string)
	if !ok {
		return ctx.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	resp, err := c.scanUsecase.GetStatusCheckIn(ctx.Context(), userID)
	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return ctx.Status(fiber.StatusOK).JSON(resp)
}