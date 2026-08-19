package controller

import (
	"errors"

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

// getUserID ambil user_id dari JWT (di-set sama AuthMiddleware ke c.Locals),
// dipakai buat isi created_by / updated_by.
func getUserID(c fiber.Ctx) (string, error) {
	userID, exists := c.Locals("user_id").(string)
	if !exists || userID == "" {
		return "", errors.New("user tidak terautentikasi")
	}
	return userID, nil
}

// GetStatusOperasional menangani GET /api/petugas/jam-operasional
// Balikin status pendaftaran + sesi hari ini + riwayat sekaligus, biar
// halaman FE cuma butuh 1 kali fetch pas mount.
func (ctrl *OperasionalController) GetStatusOperasional(c fiber.Ctx) error {
	status, err := ctrl.operasionalUsecase.GetStatusOperasional(c.Context())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "gagal mengambil status operasional",
		})
	}
	return c.Status(fiber.StatusOK).JSON(status)
}

// SimpanSesi menangani PATCH /api/petugas/jam-operasional/sesi
// (tombol "Simpan Perubahan"). Kalau sesi hari ini belum ada, otomatis
// dibikinkan (upsert) -- petugas nggak perlu tombol "mulai sesi" terpisah.
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
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "gagal menyimpan jam sesi: " + err.Error(),
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "jam sesi berhasil disimpan",
		"sesi":    sesi,
	})
}

// PerpanjangSesi menangani PATCH /api/petugas/jam-operasional/sesi/perpanjang
// (tombol "Perpanjang Sesi"). Beda dari SimpanSesi: cuma boleh majuin jam
// selesai, dan otomatis nyetel status jadi 'diperpanjang'.
func (ctrl *OperasionalController) PerpanjangSesi(c fiber.Ctx) error {
	var req entity.PerpanjangSesiRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	sesi, err := ctrl.operasionalUsecase.PerpanjangSesi(c.Context(), &req)
	if err != nil {
		if errors.Is(err, usecase.ErrSesiTidakBisaDiperpanjang) {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{
				"error": err.Error(),
			})
		}
		if errors.Is(err, usecase.ErrJamPerpanjangTidakValid) {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": err.Error(),
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "gagal memperpanjang sesi",
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "sesi CFD berhasil diperpanjang",
		"sesi":    sesi,
	})
}

// AkhiriSesiLebihAwal menangani PATCH /api/petugas/jam-operasional/sesi/akhiri
// (tombol "Akhiri Sesi Lebih Awal").
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

// UpdatePendaftaran menangani PATCH /api/petugas/jam-operasional/pendaftaran
// (tombol "Buka Pendaftaran" / "Tutup Pendaftaran").
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

	if err := ctrl.operasionalUsecase.UpdatePendaftaran(c.Context(), userID, req.IsOpen); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "gagal mengubah status pendaftaran",
		})
	}

	message := "pendaftaran pedagang berhasil ditutup"
	if req.IsOpen {
		message = "pendaftaran pedagang berhasil dibuka"
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": message,
		"isOpen":  req.IsOpen,
	})
}
