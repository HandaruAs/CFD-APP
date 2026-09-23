// OPSI B: implementasi Repository yang menyimpan ruas sebagai kolom
// JSONB (master_jalan.ruas) alih-alih tabel terpisah (jalan_ruas).
package repository

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"cfd-backend/modules/petugas/manajemen-lapak/entity"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

var (
	ErrJalanTidakDitemukan     = errors.New("jalan tidak ditemukan")
	ErrRuasTidakDitemukan      = errors.New("ruas tidak ditemukan")
	ErrEventTidakDitemukan     = errors.New("event tidak ditemukan")
	ErrTidakAdaEventAktif      = errors.New("tidak ada event CFD yang aktif")
	ErrKecamatanTidakDitemukan = errors.New("kecamatan tidak ditemukan")
	ErrJalanBelumDiikutkanEvent = errors.New("jalan ini belum diikutkan ke event ini")
)

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

func terjemahkanError(err error) error {
	if err == nil {
		return nil
	}
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23505" {
		return errors.New("data ini sudah ada, silakan periksa kembali isian kamu")
	}
	return err
}

// ============================================================
// 1. WILAYAH LENGKAP -- ruas diambil langsung dari kolom mj.ruas (JSONB).
// ============================================================

func (r *Repository) GetWilayahLengkap(ctx context.Context) ([]entity.KecamatanLengkapData, error) {
	var eventID *string
	_ = r.db.QueryRow(ctx, `
		SELECT id FROM cfd_sessions
		WHERE is_active = true AND deleted_at IS NULL
		ORDER BY created_at DESC LIMIT 1
	`).Scan(&eventID)

	rows, err := r.db.Query(ctx, `
		SELECT
			mi.id AS kecamatan_id,
			COALESCE(mi.nama_instansi, 'Tanpa Kecamatan') AS kecamatan,
			mj.id, mj.kode_jalan, mj.nama_jalan, mj.kapasitas,
			COALESCE(jks.kuota, 0) AS kuota_event,
			COALESCE(jks.terisi, 0) AS terisi,
			mj.ruas
		FROM master_instansi mi
		FULL OUTER JOIN jalan_instansi ji ON ji.instansi_id = mi.id
		FULL OUTER JOIN master_jalan mj
			ON mj.id = ji.jalan_id AND mj.deleted_at IS NULL
		LEFT JOIN jalan_kapasitas_sesi jks
			ON jks.jalan_id = mj.id AND jks.session_id = $1
		WHERE (mi.id IS NULL OR mi.deleted_at IS NULL)
		  AND (mi.id IS NOT NULL OR mj.id IS NOT NULL)
		ORDER BY mi.nama_instansi NULLS LAST, mj.nama_jalan NULLS LAST
	`, eventID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var urutan []string
	m := map[string]*struct {
		id    *string
		nama  string
		jalan []entity.JalanLengkapData
	}{}

	for rows.Next() {
		var kecID *string
		var kec string
		var id, kode, nama *string
		var kapasitas *int
		var kuotaEvent, terisi int
		var ruasRaw []byte
		if err := rows.Scan(&kecID, &kec, &id, &kode, &nama, &kapasitas, &kuotaEvent, &terisi, &ruasRaw); err != nil {
			return nil, err
		}

		kunci := "\x00tanpa-kecamatan"
		if kecID != nil {
			kunci = *kecID
		}
		if _, ok := m[kunci]; !ok {
			urutan = append(urutan, kunci)
			m[kunci] = &struct {
				id    *string
				nama  string
				jalan []entity.JalanLengkapData
			}{id: kecID, nama: kec, jalan: []entity.JalanLengkapData{}}
		}

		if id == nil {
			continue
		}

		list, err := decodeRuas(ruasRaw)
		if err != nil {
			return nil, fmt.Errorf("gagal membaca data ruas jalan %s: %w", derefStr(nama), err)
		}

		m[kunci].jalan = append(m[kunci].jalan, entity.JalanLengkapData{
			ID: *id, KodeJalan: derefStr(kode), NamaJalan: derefStr(nama), Kapasitas: derefInt(kapasitas),
			KuotaEvent: kuotaEvent, Terisi: terisi, Ruas: list,
		})
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	result := make([]entity.KecamatanLengkapData, 0, len(urutan))
	for _, kunci := range urutan {
		a := m[kunci]
		if a.jalan == nil {
			a.jalan = []entity.JalanLengkapData{}
		}
		result = append(result, entity.KecamatanLengkapData{
			KecamatanID: a.id, Kecamatan: a.nama, Jalan: a.jalan,
		})
	}

	if eventID != nil {
		if err := r.tandaiOkupansiRuas(ctx, *eventID, result); err != nil {
			return nil, err
		}
	}
	return result, nil
}

func (r *Repository) tandaiOkupansiRuas(ctx context.Context, eventID string, kecamatanList []entity.KecamatanLengkapData) error {
	rows, err := r.db.Query(ctx, `
		SELECT lk.jalan_id, lk.nomor_lapak, (pp.submitted_at IS NULL) AS lama
		FROM lapak_klaim lk
		JOIN pedagang_profiles pp ON pp.id = lk.pedagang_id
		WHERE lk.session_id = $1 AND lk.status = 'aktif'
	`, eventID)
	if err != nil {
		return err
	}
	defer rows.Close()

	type okupan struct {
		nomor int
		lama  bool
	}
	perJalan := map[string][]okupan{}
	for rows.Next() {
		var jalanID, nomorStr string
		var lama bool
		if err := rows.Scan(&jalanID, &nomorStr, &lama); err != nil {
			return err
		}
		nomor, err := strconv.Atoi(strings.TrimSpace(nomorStr))
		if err != nil {
			continue
		}
		perJalan[jalanID] = append(perJalan[jalanID], okupan{nomor: nomor, lama: lama})
	}
	if err := rows.Err(); err != nil {
		return err
	}
	if len(perJalan) == 0 {
		return nil
	}

	for ki := range kecamatanList {
		for ji := range kecamatanList[ki].Jalan {
			jalan := &kecamatanList[ki].Jalan[ji]
			list, ada := perJalan[jalan.ID]
			if !ada {
				continue
			}
			for ri := range jalan.Ruas {
				ruas := &jalan.Ruas[ri]
				for _, o := range list {
					if o.nomor < ruas.NomorMulai || o.nomor > ruas.NomorSelesai {
						continue
					}
					if o.lama {
						ruas.TerisiLama++
					} else {
						ruas.TerisiBaru++
					}
				}
			}
		}
	}
	return nil
}

func derefStr(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

func derefInt(n *int) int {
	if n == nil {
		return 0
	}
	return *n
}

func decodeRuas(raw []byte) ([]entity.RuasData, error) {
	var list []entity.RuasData
	if len(raw) > 0 {
		if err := json.Unmarshal(raw, &list); err != nil {
			return nil, err
		}
	}
	if list == nil {
		list = []entity.RuasData{}
	}
	return list, nil
}

// ============================================================
// 2. EVENT
// ============================================================

func (r *Repository) CreateEvent(ctx context.Context, userID string, req *entity.CreateEventRequest) (string, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return "", err
	}
	defer tx.Rollback(ctx)

	pendaftaranMulai, err := time.Parse(time.RFC3339, req.PendaftaranMulai)
	if err != nil {
		return "", fmt.Errorf("format pendaftaranMulai tidak valid")
	}
	pendaftaranSelesai, err := time.Parse(time.RFC3339, req.PendaftaranSelesai)
	if err != nil {
		return "", fmt.Errorf("format pendaftaranSelesai tidak valid")
	}

	var eventID string
	err = tx.QueryRow(ctx, `
		INSERT INTO cfd_sessions
			(id, nama_sesi, tanggal, jam_mulai, jam_selesai, status, is_active,
			 created_by, pendaftaran_mulai, pendaftaran_selesai, kuota_total, keterangan)
		VALUES (gen_random_uuid(), $1, $2, $3, $4, 'aktif', false, $5, $6, $7, $8, $9)
		RETURNING id
	`, req.NamaEvent, req.Tanggal, req.JamMulai, req.JamSelesai, userID,
		pendaftaranMulai, pendaftaranSelesai, req.KuotaTotal, req.Keterangan).Scan(&eventID)
	if err != nil {
		return "", terjemahkanError(err)
	}

	for _, jl := range req.Jalan {
		_, err = tx.Exec(ctx, `
			INSERT INTO jalan_kapasitas_sesi (jalan_id, session_id, kuota, terisi)
			VALUES ($1, $2, $3, 0)
			ON CONFLICT (jalan_id, session_id) DO UPDATE SET kuota = EXCLUDED.kuota
		`, jl.JalanID, eventID, jl.Kuota)
		if err != nil {
			return "", err
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return "", err
	}
	return eventID, nil
}

// ✅ FIXED: ListEvents dengan COALESCE untuk handle NULL
func (r *Repository) ListEvents(ctx context.Context) ([]entity.EventDTO, error) {
	rows, err := r.db.Query(ctx, `
		SELECT 
			id, 
			nama_sesi, 
			COALESCE(tanggal::text, '') AS tanggal, 
			COALESCE(jam_mulai::text, '') AS jam_mulai, 
			COALESCE(jam_selesai::text, '') AS jam_selesai, 
			pendaftaran_mulai,
			pendaftaran_selesai, 
			COALESCE(kuota_total, 0), 
			COALESCE(keterangan, ''), 
			COALESCE(status, ''), 
			COALESCE(is_active, false)
		FROM cfd_sessions
		WHERE deleted_at IS NULL
		ORDER BY tanggal DESC NULLS LAST, created_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var events []entity.EventDTO
	for rows.Next() {
		var e entity.EventDTO
		if err := rows.Scan(&e.ID, &e.NamaEvent, &e.Tanggal, &e.JamMulai, &e.JamSelesai,
			&e.PendaftaranMulai, &e.PendaftaranSelesai, &e.KuotaTotal, &e.Keterangan, &e.Status, &e.IsActive); err != nil {
			return nil, err
		}
		events = append(events, e)
	}

	for i := range events {
		jalanRows, err := r.db.Query(ctx, `
			SELECT mj.id, mj.nama_jalan, jks.kuota, jks.terisi
			FROM jalan_kapasitas_sesi jks
			JOIN master_jalan mj ON mj.id = jks.jalan_id
			WHERE jks.session_id = $1
			ORDER BY mj.nama_jalan
		`, events[i].ID)
		if err != nil {
			return nil, err
		}
		for jalanRows.Next() {
			var jr entity.JalanRingkasKuota
			if err := jalanRows.Scan(&jr.JalanID, &jr.NamaJalan, &jr.Kuota, &jr.Terisi); err != nil {
				jalanRows.Close()
				return nil, err
			}
			events[i].Jalan = append(events[i].Jalan, jr)
		}
		jalanRows.Close()
		if events[i].Jalan == nil {
			events[i].Jalan = []entity.JalanRingkasKuota{}
		}
	}
	return events, nil
}

func (r *Repository) SetEventAktif(ctx context.Context, eventID string, aktif bool) error {
	cmd, err := r.db.Exec(ctx, `
		UPDATE cfd_sessions SET is_active = $1, updated_at = now()
		WHERE id = $2 AND deleted_at IS NULL
	`, aktif, eventID)
	if err != nil {
		return err
	}
	if cmd.RowsAffected() == 0 {
		return ErrEventTidakDitemukan
	}
	return nil
}

func (r *Repository) GetKuotaEvent(ctx context.Context, eventID string) (*entity.KuotaEventDTO, error) {
	var dto entity.KuotaEventDTO
	dto.EventID = eventID
	err := r.db.QueryRow(ctx, `
		SELECT COALESCE(kuota_total, 0) FROM cfd_sessions WHERE id = $1 AND deleted_at IS NULL
	`, eventID).Scan(&dto.KuotaTotal)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrEventTidakDitemukan
		}
		return nil, err
	}
	err = r.db.QueryRow(ctx, `
		SELECT COALESCE(SUM(terisi), 0) FROM jalan_kapasitas_sesi WHERE session_id = $1
	`, eventID).Scan(&dto.Terisi)
	if err != nil {
		return nil, err
	}
	dto.Sisa = dto.KuotaTotal - dto.Terisi
	return &dto, nil
}

func (r *Repository) GetTerisiJalanEvent(ctx context.Context, jalanID, eventID string) (terisi int, ada bool, err error) {
	err = r.db.QueryRow(ctx, `
		SELECT terisi FROM jalan_kapasitas_sesi WHERE jalan_id = $1 AND session_id = $2
	`, jalanID, eventID).Scan(&terisi)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return 0, false, nil
		}
		return 0, false, err
	}
	return terisi, true, nil
}

func (r *Repository) UpdateKuotaJalanEvent(ctx context.Context, eventID, jalanID string, kuota int) error {
	cmd, err := r.db.Exec(ctx, `
		UPDATE jalan_kapasitas_sesi SET kuota = $1, updated_at = now()
		WHERE jalan_id = $2 AND session_id = $3
	`, kuota, jalanID, eventID)
	if err != nil {
		return err
	}
	if cmd.RowsAffected() == 0 {
		return ErrJalanBelumDiikutkanEvent
	}
	return nil
}

func (r *Repository) GetKuotaTotalEvent(ctx context.Context, eventID string) (int, error) {
	var kuota int
	err := r.db.QueryRow(ctx, `
		SELECT COALESCE(kuota_total, 0) FROM cfd_sessions
		WHERE id = $1 AND deleted_at IS NULL
	`, eventID).Scan(&kuota)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return 0, ErrEventTidakDitemukan
		}
		return 0, err
	}
	return kuota, nil
}

func (r *Repository) GetActiveEventID(ctx context.Context) (string, error) {
	var id string
	err := r.db.QueryRow(ctx, `
		SELECT id FROM cfd_sessions
		WHERE is_active = true AND deleted_at IS NULL
		ORDER BY created_at DESC LIMIT 1
	`).Scan(&id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return "", ErrTidakAdaEventAktif
		}
		return "", err
	}
	return id, nil
}

func (r *Repository) KuotaJalanUntukEvent(ctx context.Context, jalanID, eventID string) (int, error) {
	var kuota int
	err := r.db.QueryRow(ctx, `
		SELECT COALESCE(kuota, 0) FROM jalan_kapasitas_sesi
		WHERE jalan_id = $1 AND session_id = $2
	`, jalanID, eventID).Scan(&kuota)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return 0, nil
		}
		return 0, err
	}
	return kuota, nil
}

// ============================================================
// 3. RUAS JALAN
// ============================================================

func (r *Repository) JalanExists(ctx context.Context, jalanID string) (bool, error) {
	var exists bool
	err := r.db.QueryRow(ctx, `
		SELECT EXISTS(SELECT 1 FROM master_jalan WHERE id = $1 AND deleted_at IS NULL)
	`, jalanID).Scan(&exists)
	return exists, err
}

func (r *Repository) GetJalanKapasitas(ctx context.Context, jalanID string) (int, error) {
	var kapasitas int
	err := r.db.QueryRow(ctx, `
		SELECT kapasitas FROM master_jalan WHERE id = $1 AND deleted_at IS NULL
	`, jalanID).Scan(&kapasitas)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return 0, ErrJalanTidakDitemukan
		}
		return 0, err
	}
	return kapasitas, nil
}

func (r *Repository) GetRuasByJalan(ctx context.Context, jalanID string) ([]entity.RuasData, error) {
	var raw []byte
	err := r.db.QueryRow(ctx, `SELECT ruas FROM master_jalan WHERE id = $1 AND deleted_at IS NULL`, jalanID).Scan(&raw)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrJalanTidakDitemukan
		}
		return nil, err
	}
	return decodeRuas(raw)
}

func (r *Repository) GetRuasJalanID(ctx context.Context, ruasID string) (string, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, ruas FROM master_jalan
		WHERE deleted_at IS NULL AND ruas @> jsonb_build_array(jsonb_build_object('id', $1::text))
	`, ruasID)
	if err != nil {
		return "", err
	}
	defer rows.Close()

	for rows.Next() {
		var jalanID string
		var raw []byte
		if err := rows.Scan(&jalanID, &raw); err != nil {
			return "", err
		}
		list, err := decodeRuas(raw)
		if err != nil {
			continue
		}
		for _, ru := range list {
			if ru.ID == ruasID {
				return jalanID, nil
			}
		}
	}
	if err := rows.Err(); err != nil {
		return "", err
	}
	return "", ErrRuasTidakDitemukan
}

func (r *Repository) ReplaceRuasJalan(ctx context.Context, jalanID string, list []entity.RuasData) error {
	if list == nil {
		list = []entity.RuasData{}
	}
	raw, err := json.Marshal(list)
	if err != nil {
		return err
	}
	cmd, err := r.db.Exec(ctx, `
		UPDATE master_jalan SET ruas = $1, updated_at = now() WHERE id = $2 AND deleted_at IS NULL
	`, raw, jalanID)
	if err != nil {
		return terjemahkanError(err)
	}
	if cmd.RowsAffected() == 0 {
		return ErrJalanTidakDitemukan
	}
	return nil
}

// ============================================================
// 4. PEDAGANG LAMA
// ============================================================

func (r *Repository) GetPedagangLama(ctx context.Context, filter entity.PedagangLamaFilter) ([]entity.PedagangLamaItem, int, error) {
	page, limit := filter.Page, filter.Limit
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 20
	}
	offset := (page - 1) * limit

	var conds []string
	args := []interface{}{}
	argIdx := 1

	if filter.Search != "" {
		conds = append(conds, fmt.Sprintf(`(p.nama_usaha ILIKE '%%' || $%d || '%%' OR u.name ILIKE '%%' || $%d || '%%' OR p.nik ILIKE '%%' || $%d || '%%')`, argIdx, argIdx, argIdx))
		args = append(args, filter.Search)
		argIdx++
	}
	if filter.JalanID != "" {
		conds = append(conds, fmt.Sprintf(`lk.jalan_id = $%d::uuid`, argIdx))
		args = append(args, filter.JalanID)
		argIdx++
	}
	if filter.NomorMulai != nil && filter.NomorSelesai != nil {
		conds = append(conds, fmt.Sprintf(`(lk.nomor_lapak ~ '^[0-9]+$' AND lk.nomor_lapak::int BETWEEN $%d AND $%d)`, argIdx, argIdx+1))
		args = append(args, *filter.NomorMulai, *filter.NomorSelesai)
		argIdx += 2
	}
	if filter.Status == "lama" {
		conds = append(conds, `p.submitted_at IS NULL`)
	} else if filter.Status == "baru" {
		conds = append(conds, `p.submitted_at IS NOT NULL`)
	}

	extraFilter := ""
	if len(conds) > 0 {
		extraFilter = "AND " + strings.Join(conds, " AND ")
	}

	query := fmt.Sprintf(`
		SELECT DISTINCT ON (p.id)
			p.id AS id,
			u.id AS user_id,
			COALESCE(p.nik, '-') AS nik,
			u.name AS nama_lengkap,
			COALESCE(u.email, '-') AS email,
			COALESCE(p.nama_usaha, '-') AS nama_usaha,
			COALESCE(p.jenis_dagangan::text, '-') AS kategori,
			COALESCE(u.phone, '') AS kontak,
			COALESCE(mj.nama_jalan || ' / ' || lk.nomor_lapak, '-') AS lokasi,
			p.status_verifikasi::text AS status,
			CASE WHEN p.submitted_at IS NULL THEN 'lama' ELSE 'baru' END AS status_pedagang
		FROM pedagang_profiles p
		JOIN users u ON p.user_id = u.id
		LEFT JOIN lapak_klaim lk ON lk.pedagang_id = p.id
		LEFT JOIN master_jalan mj ON mj.id = lk.jalan_id
		WHERE p.deleted_at IS NULL AND u.deleted_at IS NULL %s
		ORDER BY p.id, lk.claimed_at DESC
	`, extraFilter)

	countQuery := fmt.Sprintf(`
		SELECT COUNT(*) FROM (
			SELECT DISTINCT ON (p.id) p.id
			FROM pedagang_profiles p
			JOIN users u ON p.user_id = u.id
			LEFT JOIN lapak_klaim lk ON lk.pedagang_id = p.id
			LEFT JOIN master_jalan mj ON mj.id = lk.jalan_id
			WHERE p.deleted_at IS NULL AND u.deleted_at IS NULL %s
			ORDER BY p.id, lk.claimed_at DESC
		) t`, extraFilter)
	var total int
	if err := r.db.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	pagedQuery := fmt.Sprintf(`SELECT * FROM (%s) t ORDER BY t.nama_usaha LIMIT $%d OFFSET $%d`, query, argIdx, argIdx+1)
	args = append(args, limit, offset)

	rows, err := r.db.Query(ctx, pagedQuery, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var result []entity.PedagangLamaItem
	for rows.Next() {
		var it entity.PedagangLamaItem
		if err := rows.Scan(&it.PedagangID, &it.UserID, &it.NIK, &it.NamaLengkap, &it.Email, &it.NamaUsaha, &it.Kategori, &it.Kontak, &it.Lokasi, &it.Status, &it.StatusPedagang); err != nil {
			return nil, 0, err
		}
		result = append(result, it)
	}
	return result, total, nil
}

// ============================================================
// 6. TAMBAH PEDAGANG
// ============================================================

func (r *Repository) CreatePedagangManual(ctx context.Context, req *entity.CreatePedagangRequest) (*entity.CreatePedagangResult, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	randomPassword := uuid.NewString()
	hashed, err := bcrypt.GenerateFromPassword([]byte(randomPassword), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	var userID string
	err = tx.QueryRow(ctx, `
		INSERT INTO users (id, email, password, name, phone, status)
		VALUES (gen_random_uuid(), $1, $2, $3, $4, 'active')
		RETURNING id
	`, req.Email, string(hashed), req.NamaLengkap, req.Phone).Scan(&userID)
	if err != nil {
		return nil, terjemahkanError(err)
	}

	var roleID string
	err = tx.QueryRow(ctx, `SELECT id FROM roles WHERE slug = 'pedagang' AND deleted_at IS NULL`).Scan(&roleID)
	if err != nil {
		return nil, fmt.Errorf("role pedagang tidak ditemukan di tabel roles: %w", err)
	}
	if _, err := tx.Exec(ctx, `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)`, userID, roleID); err != nil {
		return nil, err
	}

	var jenisDaganganParam, jenisLapakParam, tanggalLahirParam interface{}
	if req.JenisDagangan != "" {
		jenisDaganganParam = req.JenisDagangan
	}
	if req.JenisLapak != "" {
		jenisLapakParam = req.JenisLapak
	}
	if req.TanggalLahir != "" {
		tanggalLahirParam = req.TanggalLahir
	}

	var pedagangID string
	err = tx.QueryRow(ctx, `
		INSERT INTO pedagang_profiles
			(id, user_id, nik, nama_usaha, jenis_dagangan, nama_lengkap, phone,
			 alamat, lokasi_lapak, perkiraan_harga, tanggal_lahir, jenis_lapak,
			 status_verifikasi, submitted_at)
		VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'approved', NULL)
		RETURNING id
	`, userID, req.NIK, req.NamaUsaha, jenisDaganganParam, req.NamaLengkap, req.Phone,
		req.Alamat, req.LokasiLapak, req.PerkiraanHarga, tanggalLahirParam, jenisLapakParam).Scan(&pedagangID)
	if err != nil {
		return nil, terjemahkanError(err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return &entity.CreatePedagangResult{PedagangID: pedagangID, Email: req.Email, Password: randomPassword}, nil
}

func (r *Repository) ImportPedagangBatch(ctx context.Context, rows []entity.CreatePedagangRequest) (int, int, []string) {
	berhasil := 0
	var errs []string
	for i, row := range rows {
		rowCopy := row
		if _, err := r.CreatePedagangManual(ctx, &rowCopy); err != nil {
			errs = append(errs, fmt.Sprintf("baris %d (NIK %s): %s", i+1, row.NIK, err.Error()))
			continue
		}
		berhasil++
	}
	return berhasil, len(errs), errs
}

// ============================================================
// 7. KECAMATAN & JALAN BARU
// ============================================================

func (r *Repository) CreateKecamatan(ctx context.Context, namaKecamatan string) (string, error) {
	var id string
	err := r.db.QueryRow(ctx, `
		INSERT INTO master_instansi (id, nama_unit, nama_instansi)
		VALUES (gen_random_uuid(), $1, $1)
		RETURNING id
	`, namaKecamatan).Scan(&id)
	if err != nil {
		return "", terjemahkanError(err)
	}
	return id, nil
}

func (r *Repository) CreateJalanBaru(ctx context.Context, req *entity.CreateJalanBaruRequest) (string, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return "", err
	}
	defer tx.Rollback(ctx)

	var jalanID string
	err = tx.QueryRow(ctx, `
		INSERT INTO master_jalan (id, kode_jalan, nama_jalan, kapasitas)
		VALUES (gen_random_uuid(), $1, $2, $3)
		RETURNING id
	`, req.KodeJalan, req.NamaJalan, req.Kapasitas).Scan(&jalanID)
	if err != nil {
		return "", terjemahkanError(err)
	}

	if _, err := tx.Exec(ctx, `
		INSERT INTO jalan_instansi (jalan_id, instansi_id) VALUES ($1, $2)
	`, jalanID, req.KecamatanID); err != nil {
		return "", terjemahkanError(err)
	}

	if err := tx.Commit(ctx); err != nil {
		return "", err
	}
	return jalanID, nil
}

func (r *Repository) SumKuotaRuas(ctx context.Context, jalanID string) (int, error) {
	var total int
	err := r.db.QueryRow(ctx, `
		SELECT COALESCE(SUM((elem->>'kuota')::int), 0)
		FROM master_jalan, jsonb_array_elements(ruas) AS elem
		WHERE id = $1 AND deleted_at IS NULL
	`, jalanID).Scan(&total)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return 0, nil
		}
		return 0, err
	}
	return total, nil
}

func (r *Repository) UpdateJalanBaru(ctx context.Context, jalanID string, req *entity.UpdateJalanBaruRequest) error {
	cmd, err := r.db.Exec(ctx, `
		UPDATE master_jalan
		SET kode_jalan = $1, nama_jalan = $2, kapasitas = $3, updated_at = now()
		WHERE id = $4 AND deleted_at IS NULL
	`, req.KodeJalan, req.NamaJalan, req.Kapasitas, jalanID)
	if err != nil {
		return terjemahkanError(err)
	}
	if cmd.RowsAffected() == 0 {
		return ErrJalanTidakDitemukan
	}
	return nil
}

// ============================================================
// 8. HAPUS EVENT, KECAMATAN, JALAN
// ============================================================

func (r *Repository) DeleteEvent(ctx context.Context, eventID string) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx, `DELETE FROM jalan_kapasitas_sesi WHERE session_id = $1`, eventID); err != nil {
		return err
	}

	cmd, err := tx.Exec(ctx, `UPDATE cfd_sessions SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL`, eventID)
	if err != nil {
		return err
	}
	if cmd.RowsAffected() == 0 {
		return ErrEventTidakDitemukan
	}

	return tx.Commit(ctx)
}

func (r *Repository) DeleteKecamatan(ctx context.Context, kecamatanID string) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	rows, err := tx.Query(ctx, `
		SELECT ji.jalan_id
		FROM jalan_instansi ji
		JOIN master_jalan mj ON mj.id = ji.jalan_id AND mj.deleted_at IS NULL
		WHERE ji.instansi_id = $1
	`, kecamatanID)
	if err != nil {
		return err
	}
	var jalanIDs []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			rows.Close()
			return err
		}
		jalanIDs = append(jalanIDs, id)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return err
	}

	for _, jalanID := range jalanIDs {
		if _, err := tx.Exec(ctx, `DELETE FROM jalan_kapasitas_sesi WHERE jalan_id = $1`, jalanID); err != nil {
			return err
		}
		if _, err := tx.Exec(ctx, `UPDATE master_jalan SET deleted_at = now() WHERE id = $1`, jalanID); err != nil {
			return err
		}
	}

	if _, err := tx.Exec(ctx, `DELETE FROM jalan_instansi WHERE instansi_id = $1`, kecamatanID); err != nil {
		return err
	}

	cmd, err := tx.Exec(ctx, `UPDATE master_instansi SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL`, kecamatanID)
	if err != nil {
		return err
	}
	if cmd.RowsAffected() == 0 {
		return ErrKecamatanTidakDitemukan
	}

	return tx.Commit(ctx)
}

func (r *Repository) DeleteJalanBaru(ctx context.Context, jalanID string) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx, `DELETE FROM jalan_instansi WHERE jalan_id = $1`, jalanID); err != nil {
		return err
	}

	if _, err := tx.Exec(ctx, `DELETE FROM jalan_kapasitas_sesi WHERE jalan_id = $1`, jalanID); err != nil {
		return err
	}

	cmd, err := tx.Exec(ctx, `UPDATE master_jalan SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL`, jalanID)
	if err != nil {
		return err
	}
	if cmd.RowsAffected() == 0 {
		return ErrJalanTidakDitemukan
	}

	return tx.Commit(ctx)
}

func (r *Repository) AssignJalanKeEventAktif(ctx context.Context, eventID, jalanID string, kuota int) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO jalan_kapasitas_sesi (jalan_id, session_id, kuota, terisi)
		VALUES ($1, $2, $3, 0)
		ON CONFLICT (jalan_id, session_id) DO UPDATE SET kuota = EXCLUDED.kuota, updated_at = now()
	`, jalanID, eventID, kuota)
	return err
}

func (r *Repository) SumKuotaJalanEvent(ctx context.Context, eventID string, kecualiJalanID string) (int, error) {
	var total int
	err := r.db.QueryRow(ctx, `
		SELECT COALESCE(SUM(kuota), 0) FROM jalan_kapasitas_sesi
		WHERE session_id = $1 AND jalan_id != $2
	`, eventID, kecualiJalanID).Scan(&total)
	return total, err
}