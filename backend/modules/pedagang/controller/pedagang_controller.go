package controller

import (
	"errors"

	"cfd-backend/modules/pedagang/entity"
	"cfd-backend/modules/pedagang/usecase"
	userUC "cfd-backend/modules/user/usecase"

	"github.com/gofiber/fiber/v3"
	"github.com/jackc/pgx/v5/pgconn"
)

type CreatePedagangByAdminRequest struct {
	Name          string `json:"name" validate:"required"`
	Email         string `json:"email" validate:"required,email"`
	Phone         string `json:"phone" validate:"required"`
	Password      string `json:"password" validate:"required,min=8"`
	NIK           string `json:"nik" validate:"required,len=16"`
	TanggalLahir  string `json:"tanggal_lahir" validate:"required,datetime=2006-01-02"`
	NamaUsaha     string `json:"nama_usaha" validate:"required"`
	JenisDagangan string `json:"jenis_dagangan" validate:"required,oneof=makanan_minuman bukan_makanan_minuman"`
	JenisLapak    string `json:"jenis_lapak" validate:"required,oneof=rombong meja"`
}

type UpdatePedagangByAdminRequest struct {
	Name          string `json:"name" validate:"required"`
	Phone         string `json:"phone" validate:"required"`
	NamaUsaha     string `json:"nama_usaha" validate:"required"`
	JenisDagangan string `json:"jenis_dagangan" validate:"required,oneof=makanan_minuman bukan_makanan_minuman"`
	JenisLapak    string `json:"jenis_lapak" validate:"required,oneof=rombong meja"`
}

type PedagangController struct {
	pedagangUsecase usecase.PedagangUsecase
	userUsecase     userUC.UserUsecase
}

func NewPedagangController(
	pedagangUsecase usecase.PedagangUsecase,
	userUsecase userUC.UserUsecase,
) *PedagangController {
	return &PedagangController{
		pedagangUsecase: pedagangUsecase,
		userUsecase:     userUsecase,
	}
}

func (ctrl *PedagangController) AjukanUsaha(c fiber.Ctx) error {
	var req entity.PengajuanUsahaRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	userID, exists := c.Locals("user_id").(string)
	if !exists || userID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "User tidak terautentikasi",
		})
	}

	pengajuanID, err := ctrl.pedagangUsecase.AjukanUsaha(c.Context(), userID, &req)
	if err != nil {
		switch {
		case errors.Is(err, usecase.ErrPendaftaranDitutup):
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": err.Error(),
			})
		case errors.Is(err, usecase.ErrDiluarJamPendaftaran):
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": err.Error(),
			})
		}

		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			if pgErr.ConstraintName == "pedagang_profiles_user_id_key" {
				return c.Status(fiber.StatusConflict).JSON(fiber.Map{
					"error": "kamu sudah pernah mengajukan usaha sebelumnya",
				})
			}
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{
				"error": "NIK sudah terdaftar",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "gagal menyimpan pengajuan",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message":      "pengajuan usaha berhasil dikirim, menunggu verifikasi petugas",
		"pengajuan_id": pengajuanID,
	})
}

func (ctrl *PedagangController) StatusPengajuan(c fiber.Ctx) error {
	userID, exists := c.Locals("user_id").(string)
	if !exists || userID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "User tidak terautentikasi",
		})
	}

	pengajuan, err := ctrl.pedagangUsecase.StatusPengajuan(c.Context(), userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "gagal mengambil data pengajuan",
		})
	}

	if pengajuan == nil {
		return c.Status(fiber.StatusOK).JSON(fiber.Map{
			"has_pengajuan": false,
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"has_pengajuan":   true,
		"id":              pengajuan.ID,
		"nik":             pengajuan.NIK,
		"nama_lengkap":    pengajuan.NamaLengkap,
		"tanggal_lahir":   pengajuan.TanggalLahir,
		"nama_usaha":      pengajuan.NamaUsaha,
		"jenis_dagangan":  pengajuan.JenisDagangan,
		"jenis_lapak":     pengajuan.JenisLapak,
		"perkiraan_harga": pengajuan.PerkiraanHarga,
		"alamat":          pengajuan.Alamat,
		"status":          pengajuan.StatusVerifikasi,
		"catatan":         pengajuan.Catatan,
	})
}

func (ctrl *PedagangController) CreatePedagangByAdmin(c fiber.Ctx) error {
	var req CreatePedagangByAdminRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	userID, err := ctrl.userUsecase.RegisterPedagangByAdmin(
		c.Context(),
		req.Name, req.Email, req.Phone, req.Password,
	)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Gagal membuat akun: " + err.Error(),
		})
	}

	err = ctrl.pedagangUsecase.CreatePengajuanByAdmin(
		c.Context(),
		userID, req.NIK, req.Name, req.TanggalLahir, req.NamaUsaha, req.JenisDagangan, req.JenisLapak,
	)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Gagal menyimpan profil: " + err.Error(),
		})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message": "Pedagang berhasil ditambahkan",
		"user_id": userID,
	})
}

func (ctrl *PedagangController) ListPedagangByAdmin(c fiber.Ctx) error {
	users, total, err := ctrl.pedagangUsecase.ListPedagangByAdmin(c.Context())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Gagal mengambil data pedagang",
		})
	}

	return c.Status(fiber.StatusOK).JSON(entity.ListPedagangResponse{
		Users: users,
		Total: total,
	})
}

func (ctrl *PedagangController) GetPedagangStats(c fiber.Ctx) error {
	stats, err := ctrl.pedagangUsecase.GetPedagangStats(c.Context())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Gagal mengambil statistik",
		})
	}

	return c.Status(fiber.StatusOK).JSON(stats)
}

func (ctrl *PedagangController) GetPedagangByID(c fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "ID tidak boleh kosong",
		})
	}

	user, err := ctrl.pedagangUsecase.GetPedagangByID(c.Context(), id)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Pedagang tidak ditemukan",
		})
	}

	return c.Status(fiber.StatusOK).JSON(user)
}

func (ctrl *PedagangController) UpdatePedagangByAdmin(c fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "ID tidak boleh kosong",
		})
	}

	var req UpdatePedagangByAdminRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	err := ctrl.pedagangUsecase.UpdatePedagangByAdmin(
		c.Context(), id, req.Name, req.Phone, req.NamaUsaha, req.JenisDagangan, req.JenisLapak,
	)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Gagal menyimpan perubahan: " + err.Error(),
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "Pedagang berhasil diperbarui",
	})
}

func (ctrl *PedagangController) DeletePedagangByAdmin(c fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "ID tidak boleh kosong",
		})
	}

	err := ctrl.pedagangUsecase.DeletePedagangByAdmin(c.Context(), id)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Gagal menghapus data",
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "Pedagang berhasil dihapus",
	})
}

func (ctrl *PedagangController) CekStatusPendaftaran(c fiber.Ctx) error {
	isOpen, dalamJam, err := ctrl.pedagangUsecase.CekStatusPendaftaran(c.Context())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "gagal mengambil status pendaftaran",
		})
	}
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"is_open":   isOpen,
		"dalam_jam": dalamJam,
	})
}