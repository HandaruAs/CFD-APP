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
	Name           string `json:"name" binding:"required"`
	Email          string `json:"email" binding:"required,email"`
	Phone          string `json:"phone" binding:"required"`
	Password       string `json:"password" binding:"required,min=8"`
	NIK            string `json:"nik" binding:"required,len=16"`
	NamaUsaha      string `json:"nama_usaha" binding:"required"`
	JenisDagangan  string `json:"jenis_dagangan" binding:"required"`
	PerkiraanHarga string `json:"perkiraan_harga" binding:"required"`
	Alamat         string `json:"alamat" binding:"required"`
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
		"nama_usaha":      pengajuan.NamaUsaha,
		"jenis_dagangan":  pengajuan.JenisDagangan,
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
		userID, req.NIK, req.NamaUsaha, req.JenisDagangan, req.PerkiraanHarga, req.Alamat,
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