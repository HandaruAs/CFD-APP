package controller

import (
	"bytes"
	"encoding/csv"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"path/filepath"
	"runtime/debug"
	"strconv"
	"strings"

	"cfd-backend/modules/petugas/manajemen-lapak/entity"
	"cfd-backend/modules/petugas/manajemen-lapak/usecase"
	"github.com/gofiber/fiber/v3"
)

type ManajemenLapakController struct {
	usecase usecase.ManajemenLapakUsecase
}

func NewManajemenLapakController(u usecase.ManajemenLapakUsecase) *ManajemenLapakController {
	return &ManajemenLapakController{usecase: u}
}

func getUserID(c fiber.Ctx) (string, error) {
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return "", errors.New("user tidak terautentikasi")
	}
	return userID, nil
}

// GET /api/petugas/manajemen-lapak/wilayah -- checklist #1
func (ctrl *ManajemenLapakController) GetWilayah(c fiber.Ctx) error {
	data, err := ctrl.usecase.GetWilayahLengkap(c.Context())
	if err != nil {
		log.Println("[manajemen-lapak] GetWilayah error:", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "gagal mengambil data wilayah"})
	}
	return c.Status(fiber.StatusOK).JSON(fiber.Map{"data": data})
}

// POST /api/petugas/manajemen-lapak/event -- checklist #2
func (ctrl *ManajemenLapakController) CreateEvent(c fiber.Ctx) error {
	var req entity.CreateEventRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "format request tidak valid: " + err.Error()})
	}
	userID, err := getUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": err.Error()})
	}
	id, err := ctrl.usecase.CreateEvent(c.Context(), userID, &req)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"message": "event berhasil dibuat", "id": id})
}

// GET /api/petugas/manajemen-lapak/event
func (ctrl *ManajemenLapakController) ListEvents(c fiber.Ctx) error {
	events, err := ctrl.usecase.ListEvents(c.Context())
	if err != nil {
		log.Println("[manajemen-lapak] ListEvents error:", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "gagal mengambil daftar event"})
	}
	return c.Status(fiber.StatusOK).JSON(fiber.Map{"data": events})
}

// PATCH /api/petugas/manajemen-lapak/event/:id/aktif  { "aktif": true }
func (ctrl *ManajemenLapakController) SetEventAktif(c fiber.Ctx) error {
	var body struct {
		Aktif bool `json:"aktif"`
	}
	if err := c.Bind().Body(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	if err := ctrl.usecase.SetEventAktif(c.Context(), c.Params("id"), body.Aktif); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(fiber.StatusOK).JSON(fiber.Map{"message": "status event berhasil diubah"})
}

// GET /api/petugas/manajemen-lapak/event/:id/kuota -- checklist #5
func (ctrl *ManajemenLapakController) GetKuotaEvent(c fiber.Ctx) error {
	kuota, err := ctrl.usecase.GetKuotaEvent(c.Context(), c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(fiber.StatusOK).JSON(kuota)
}

// POST /api/petugas/manajemen-lapak/ruas -- checklist #3, #7, #8
func (ctrl *ManajemenLapakController) CreateRuas(c fiber.Ctx) error {
	var req entity.CreateRuasRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "format request tidak valid: " + err.Error()})
	}
	id, err := ctrl.usecase.CreateRuas(c.Context(), &req)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"message": "ruas berhasil ditambahkan", "id": id})
}

// PUT /api/petugas/manajemen-lapak/ruas/:id
func (ctrl *ManajemenLapakController) UpdateRuas(c fiber.Ctx) error {
	var req entity.UpdateRuasRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "format request tidak valid: " + err.Error()})
	}
	if err := ctrl.usecase.UpdateRuas(c.Context(), c.Params("id"), &req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(fiber.StatusOK).JSON(fiber.Map{"message": "ruas berhasil diperbarui"})
}

// DELETE /api/petugas/manajemen-lapak/ruas/:id
func (ctrl *ManajemenLapakController) DeleteRuas(c fiber.Ctx) error {
	if err := ctrl.usecase.DeleteRuas(c.Context(), c.Params("id")); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(fiber.StatusOK).JSON(fiber.Map{"message": "ruas berhasil dihapus"})
}

// GET /api/petugas/manajemen-lapak/pedagang-lama -- checklist #4 (read-only,
// makanya cuma ada handler GET di controller ini, gak ada update/delete)
func (ctrl *ManajemenLapakController) GetPedagangLama(c fiber.Ctx) error {
	filter := entity.PedagangLamaFilter{
		Search:  c.Query("search", ""),
		JalanID: c.Query("jalanId", ""),
		Status:  c.Query("status", ""),
	}
	filter.Page, _ = strconv.Atoi(c.Query("page", "1"))
	filter.Limit, _ = strconv.Atoi(c.Query("limit", "20"))
	if v := c.Query("nomorMulai", ""); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			filter.NomorMulai = &n
		}
	}
	if v := c.Query("nomorSelesai", ""); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			filter.NomorSelesai = &n
		}
	}

	data, err := ctrl.usecase.GetPedagangLama(c.Context(), filter)
	if err != nil {
		log.Println("[manajemen-lapak] GetPedagangLama error:", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "gagal mengambil data pedagang lama"})
	}
	return c.Status(fiber.StatusOK).JSON(data)
}

// POST /api/petugas/manajemen-lapak/pedagang -- "Tambah Data" manual,
// field-nya disamain kayak form pendaftaran pedagang beneran (ada
// email). Password TIDAK diminta dari petugas -- sistem yang generate
// otomatis, dibalikin sekali di response ini.
func (ctrl *ManajemenLapakController) CreatePedagang(c fiber.Ctx) (retErr error) {
	// Recover manual di sini (bukan cuma andelin recover.New() global)
	// biar kalau ada panic, pesannya jelas kekirim ke response DAN ke
	// terminal -- gak cuma "500" doang tanpa detail kayak sebelumnya.
	defer func() {
		if r := recover(); r != nil {
			log.Printf("[manajemen-lapak] PANIC di CreatePedagang: %v\n%s", r, debug.Stack())
			retErr = c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": fmt.Sprintf("terjadi error internal: %v", r),
			})
		}
	}()

	var req entity.CreatePedagangRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "format request tidak valid: " + err.Error()})
	}
	result, err := ctrl.usecase.CreatePedagang(c.Context(), &req)
	if err != nil {
		log.Println("[manajemen-lapak] CreatePedagang error:", err)
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"message": "pedagang berhasil ditambahkan", "data": result})
}

// POST /api/petugas/manajemen-lapak/pedagang/import -- upload file
// (.json atau .csv) buat nambah banyak pedagang sekaligus, semuanya
// otomatis kekategori "lama".
//
// Format CSV (baris pertama header, dipisah koma):
//
//	nama_lengkap,nik,email,nama_usaha,jenis_dagangan,phone,alamat,lokasi_lapak,perkiraan_harga,tanggal_lahir,jenis_lapak
//
// Kolom nama_lengkap, nik, email, nama_usaha wajib ada isinya; sisanya
// boleh dikosongin. Format JSON: array objek dengan field yang sama
// persis kayak body POST /pedagang (namaLengkap, nik, email, dst).
func (ctrl *ManajemenLapakController) ImportPedagang(c fiber.Ctx) (retErr error) {
	defer func() {
		if r := recover(); r != nil {
			log.Printf("[manajemen-lapak] PANIC di ImportPedagang: %v\n%s", r, debug.Stack())
			retErr = c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": fmt.Sprintf("terjadi error internal: %v", r),
			})
		}
	}()

	fileHeader, err := c.FormFile("file")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "file gak ditemukan, pastikan field-nya bernama 'file'"})
	}

	f, err := fileHeader.Open()
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "gagal membuka file"})
	}
	defer f.Close()

	raw, err := io.ReadAll(f)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "gagal membaca isi file"})
	}

	ext := strings.ToLower(filepath.Ext(fileHeader.Filename))
	var rows []entity.CreatePedagangRequest

	switch ext {
	case ".json":
		if err := json.Unmarshal(raw, &rows); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "format JSON gak valid: " + err.Error()})
		}
	case ".csv":
		rows, err = parseCSVPedagang(raw)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
		}
	default:
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "format file '" + ext + "' belum didukung, pakai .json atau .csv (Excel: simpan dulu sebagai CSV)",
		})
	}

	result, err := ctrl.usecase.ImportPedagang(c.Context(), rows)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(fiber.StatusOK).JSON(result)
}

// parseCSVPedagang -- header wajib ada, urutan kolom bebas asal nama
// headernya cocok (case-insensitive): nama_lengkap, nik, email,
// nama_usaha, jenis_dagangan, phone, alamat, lokasi_lapak,
// perkiraan_harga, tanggal_lahir, jenis_lapak.
func parseCSVPedagang(raw []byte) ([]entity.CreatePedagangRequest, error) {
	reader := csv.NewReader(bytes.NewReader(raw))
	reader.TrimLeadingSpace = true
	records, err := reader.ReadAll()
	if err != nil {
		return nil, errors.New("gagal membaca CSV: " + err.Error())
	}
	if len(records) < 2 {
		return nil, errors.New("CSV kosong atau cuma ada header")
	}

	colIndex := map[string]int{}
	for i, h := range records[0] {
		colIndex[strings.ToLower(strings.TrimSpace(h))] = i
	}
	get := func(row []string, col string) string {
		idx, ok := colIndex[col]
		if !ok || idx >= len(row) {
			return ""
		}
		return strings.TrimSpace(row[idx])
	}

	var rows []entity.CreatePedagangRequest
	for _, row := range records[1:] {
		if len(row) == 0 || (len(row) == 1 && row[0] == "") {
			continue // baris kosong, lewati
		}
		rows = append(rows, entity.CreatePedagangRequest{
			NamaLengkap:    get(row, "nama_lengkap"),
			NIK:            get(row, "nik"),
			Email:          get(row, "email"),
			NamaUsaha:      get(row, "nama_usaha"),
			JenisDagangan:  get(row, "jenis_dagangan"),
			Phone:          get(row, "phone"),
			Alamat:         get(row, "alamat"),
			LokasiLapak:    get(row, "lokasi_lapak"),
			PerkiraanHarga: get(row, "perkiraan_harga"),
			TanggalLahir:   get(row, "tanggal_lahir"),
			JenisLapak:     get(row, "jenis_lapak"),
		})
	}
	return rows, nil
}

// POST /api/petugas/manajemen-lapak/kecamatan -- tabel "Kecamatan"
// di UI 4-tabel Ruas & Kuota.
func (ctrl *ManajemenLapakController) CreateKecamatan(c fiber.Ctx) error {
	var body struct {
		NamaKecamatan string `json:"namaKecamatan"`
	}
	if err := c.Bind().Body(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "format request tidak valid: " + err.Error()})
	}
	id, err := ctrl.usecase.CreateKecamatan(c.Context(), body.NamaKecamatan)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"message": "kecamatan berhasil ditambahkan", "id": id})
}

// POST /api/petugas/manajemen-lapak/jalan -- tabel "Jalan" di UI
// 4-tabel Ruas & Kuota.
func (ctrl *ManajemenLapakController) CreateJalanBaru(c fiber.Ctx) error {
	var req entity.CreateJalanBaruRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "format request tidak valid: " + err.Error()})
	}
	id, err := ctrl.usecase.CreateJalanBaru(c.Context(), &req)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"message": "jalan berhasil ditambahkan", "id": id})
}

// PUT /api/petugas/manajemen-lapak/jalan/:id -- edit kode/nama/kapasitas
// jalan (tabel "Jalan" di UI 4-tabel Ruas & Kuota).
func (ctrl *ManajemenLapakController) UpdateJalanBaru(c fiber.Ctx) error {
	var req entity.UpdateJalanBaruRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "format request tidak valid: " + err.Error()})
	}
	if err := ctrl.usecase.UpdateJalanBaru(c.Context(), c.Params("id"), &req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(fiber.StatusOK).JSON(fiber.Map{"message": "jalan berhasil diperbarui"})
}

// DELETE /api/petugas/manajemen-lapak/event/:id
func (ctrl *ManajemenLapakController) DeleteEvent(c fiber.Ctx) error {
	if err := ctrl.usecase.DeleteEvent(c.Context(), c.Params("id")); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(fiber.StatusOK).JSON(fiber.Map{"message": "event berhasil dihapus"})
}

// DELETE /api/petugas/manajemen-lapak/kecamatan/:id
func (ctrl *ManajemenLapakController) DeleteKecamatan(c fiber.Ctx) error {
	if err := ctrl.usecase.DeleteKecamatan(c.Context(), c.Params("id")); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(fiber.StatusOK).JSON(fiber.Map{"message": "kecamatan berhasil dihapus"})
}

// DELETE /api/petugas/manajemen-lapak/jalan/:id
func (ctrl *ManajemenLapakController) DeleteJalanBaru(c fiber.Ctx) error {
	if err := ctrl.usecase.DeleteJalanBaru(c.Context(), c.Params("id")); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(fiber.StatusOK).JSON(fiber.Map{"message": "jalan berhasil dihapus"})
}

// POST /api/petugas/manajemen-lapak/jalan/:id/assign-event -- assign/
// update kuota 1 jalan ke event yang lagi aktif. Solusi buat jalan
// yang dibuat SETELAH event-nya aktif (gak keikut pas Tambah Event).
func (ctrl *ManajemenLapakController) AssignJalanKeEventAktif(c fiber.Ctx) error {
	var req entity.AssignJalanEventRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "format request tidak valid: " + err.Error()})
	}
	if err := ctrl.usecase.AssignJalanKeEventAktif(c.Context(), c.Params("id"), &req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(fiber.StatusOK).JSON(fiber.Map{"message": "jalan berhasil ditambahkan ke event aktif"})
}

// PATCH /api/petugas/manajemen-lapak/event/:id/jalan/:jalanId -- edit
// kuota jalan yang SUDAH diikutkan ke event :id, gak peduli event itu
// aktif atau belum. Beda dari AssignJalanKeEventAktif yang cuma jalan
// buat event yang lagi aktif (dan implisit ambil event aktifnya sendiri).
func (ctrl *ManajemenLapakController) UpdateKuotaJalanEvent(c fiber.Ctx) error {
	var req entity.AssignJalanEventRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "format request tidak valid: " + err.Error()})
	}
	if err := ctrl.usecase.UpdateKuotaJalanEvent(c.Context(), c.Params("id"), c.Params("jalanId"), &req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(fiber.StatusOK).JSON(fiber.Map{"message": "kuota jalan berhasil diperbarui"})
}