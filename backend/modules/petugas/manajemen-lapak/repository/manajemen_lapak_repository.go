// OPSI B: implementasi Repository yang menyimpan ruas sebagai kolom
// JSONB (master_jalan.ruas) alih-alih tabel terpisah (jalan_ruas).
//
// CARA PAKAI: file ini adalah PENGGANTI dari
// modules/petugas/manajemen-lapak/repository/manajemen_lapak_repository.go
// (opsi A) -- bukan tambahan yang jalan bersamaan.
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
	// ErrJalanBelumDiikutkanEvent -- beda dari ErrJalanTidakDitemukan:
	// jalannya ADA, tapi belum pernah di-assign kuota ke event ini
	// (gak ada baris di jalan_kapasitas_sesi buat kombinasi ini).
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

	// PENTING: query ini di-drive dari master_instansi (pakai FULL OUTER
	// JOIN), BUKAN dari master_jalan. Kalau di-drive dari master_jalan,
	// kecamatan yang belum punya jalan sama sekali gak akan pernah muncul
	// di hasil -- padahal kecamatan yang baru dibuat SELALU dalam kondisi
	// itu, jadi user gak bisa nambahin jalan ke kecamatan barunya.
	// FULL OUTER JOIN dipakai supaya jalan yatim (gak punya baris di
	// jalan_instansi) tetap kelihatan sebagai "Tanpa Kecamatan".
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
		// Semua kolom dari mj bisa NULL: baris kecamatan yang belum punya
		// jalan (atau jalannya sudah di-soft-delete) tetap ikut kebawa
		// karena FULL OUTER JOIN di atas.
		var id, kode, nama *string
		var kapasitas *int
		var kuotaEvent, terisi int
		var ruasRaw []byte
		if err := rows.Scan(&kecID, &kec, &id, &kode, &nama, &kapasitas, &kuotaEvent, &terisi, &ruasRaw); err != nil {
			return nil, err
		}

		// Kunci grup pakai ID kecamatan, bukan namanya -- dua kecamatan
		// dengan nama sama gak lagi ketimpa jadi satu baris.
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

		// Baris kecamatan kosong: gak ada jalan yang perlu ditambahkan,
		// tapi kecamatannya sendiri tetap masuk hasil (dengan jalan: []).
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
		// jalan SELALU slice kosong (bukan nil) supaya ke-marshal jadi []
		// di JSON, bukan null -- frontend nge-map langsung tanpa crash.
		if a.jalan == nil {
			a.jalan = []entity.JalanLengkapData{}
		}
		result = append(result, entity.KecamatanLengkapData{
			KecamatanID: a.id, Kecamatan: a.nama, Jalan: a.jalan,
		})
	}

	// Isi TerisiLama/TerisiBaru tiap ruas -- cuma kalau ada event aktif,
	// soalnya lapak_klaim selalu terikat ke 1 session_id (= event).
	if eventID != nil {
		if err := r.tandaiOkupansiRuas(ctx, *eventID, result); err != nil {
			return nil, err
		}
	}
	return result, nil
}

// tandaiOkupansiRuas -- ambil semua klaim lapak AKTIF di event ini
// (join ke pedagang_profiles buat tau lama/baru dari submitted_at),
// terus tempelkan hitungannya ke ruas yang rentang nomor_lapak-nya
// cocok. Satu query buat semua jalan sekaligus (bukan per-jalan),
// biar gak N+1 pas kecamatan/jalan-nya banyak.
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

	// map[jalanID] -> list nomor lapak (dipisah lama/baru)
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
			continue // nomor_lapak non-numerik (harusnya gak pernah terjadi, tapi jangan sampai bikin gagal semua)
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
// 2. EVENT -- gak nyentuh ruas sama sekali, gak berubah.
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

func (r *Repository) ListEvents(ctx context.Context) ([]entity.EventDTO, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, nama_sesi, tanggal::text, jam_mulai::text, jam_selesai::text, pendaftaran_mulai,
		       pendaftaran_selesai, COALESCE(kuota_total, 0), COALESCE(keterangan, ''), status, is_active
		FROM cfd_sessions
		WHERE deleted_at IS NULL
		ORDER BY tanggal DESC, created_at DESC
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

// GetKuotaTotalEvent -- ambil kuota_total 1 event aja. Dipisah dari
// ListEvents supaya usecase gak perlu narik SELURUH event (plus query
// daftar jalan per event) cuma buat baca satu angka.
// GetTerisiJalanEvent -- terisi 1 jalan di 1 event tertentu (BUKAN cuma
// event aktif). "ada" false berarti jalan ini belum pernah diikutkan ke
// event tersebut (gak ada baris jalan_kapasitas_sesi-nya).
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

// UpdateKuotaJalanEvent -- edit kuota 1 jalan yang SUDAH diikutkan ke 1
// event tertentu, apa pun status aktif event itu (beda dari
// AssignJalanKeEventAktif yang cuma jalan buat event yang lagi aktif).
// Validasi (kapasitas, terisi, total vs kuota event) ada di usecase.
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
// 3. RUAS JALAN -- baca-tulis lewat kolom master_jalan.ruas (JSONB).
//    Semua logic hitung nomorMulai/nomorSelesai udah dikerjain di
//    usecase; repository di sini cuma baca & simpen daftar mentahnya.
// ============================================================

func (r *Repository) JalanExists(ctx context.Context, jalanID string) (bool, error) {
	var exists bool
	err := r.db.QueryRow(ctx, `
		SELECT EXISTS(SELECT 1 FROM master_jalan WHERE id = $1 AND deleted_at IS NULL)
	`, jalanID).Scan(&exists)
	return exists, err
}

// GetJalanKapasitas -- ambil kapasitas dasar 1 jalan (master_jalan.kapasitas).
// Dipakai buat validasi supaya kuota yang dialokasikan ke sebuah event
// gak pernah melebihi kapasitas fisik jalan itu sendiri (lihat
// ErrKuotaLebihDariKapasitas di usecase).
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

// GetRuasJalanID -- cari jalan mana yang punya ruas dengan id ini,
// lewat operator containment JSONB (@>) buat mempersempit, terus
// dipastikan lagi manual di kode Go.
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

// ReplaceRuasJalan -- timpa seluruh daftar ruas milik 1 jalan
// sekaligus (dipanggil usecase setelah recompute nomorMulai/selesai).
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
// 4. PEDAGANG LAMA -- gak berubah.
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

	// Filter tambahan -- checklist #4: Pencarian, Ruas (jalanId + rentang
	// nomor dari ruas yang dipilih), dan Status. Semuanya diterapkan di
	// query utama (bukan query luar) karena butuh akses ke lk/mj.
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
	// Status di sini artinya "lama" atau "baru" (pedagang.jpg pill di
	// tabel Pedagang) -- BUKAN status_verifikasi (pending/approved/
	// rejected). Dulu salah sasaran ke status_verifikasi padahal gak
	// ada dropdown apapun di FE yang ngirim nilai itu, jadi filternya
	// nganggur. "lama" = submitted_at NULL (dientri manual/import
	// petugas), "baru" = submitted_at NOT NULL (daftar sendiri lewat
	// sistem).
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
		WHERE p.deleted_at IS NULL %s
		ORDER BY p.id, lk.claimed_at DESC
	`, extraFilter)

	countQuery := fmt.Sprintf(`
		SELECT COUNT(*) FROM (
			SELECT DISTINCT ON (p.id) p.id
			FROM pedagang_profiles p
			JOIN users u ON p.user_id = u.id
			LEFT JOIN lapak_klaim lk ON lk.pedagang_id = p.id
			LEFT JOIN master_jalan mj ON mj.id = lk.jalan_id
			WHERE p.deleted_at IS NULL %s
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
		if err := rows.Scan(&it.PedagangID, &it.NIK, &it.NamaLengkap, &it.Email, &it.NamaUsaha, &it.Kategori, &it.Kontak, &it.Lokasi, &it.Status, &it.StatusPedagang); err != nil {
			return nil, 0, err
		}
		result = append(result, it)
	}
	return result, total, nil
}

// ============================================================
// 6. TAMBAH PEDAGANG (manual & import file)
// ============================================================

// CreatePedagangManual -- dipakai baik dari form "Tambah Data" maupun
// dari proses import file (dipanggil per baris). submitted_at SENGAJA
// dibiarkan NULL -- itu yang bikin pedagang ini otomatis kekategori
// "lama" (beda dari pedagang yang daftar sendiri lewat sistem, yang
// submitted_at-nya otomatis keisi pas dia submit pengajuan).
//
// Email dari form (persis kayak pendaftaran beneran), passwordnya
// SISTEM yang generate otomatis (petugas gak ngisi/ngarang password) --
// password plaintext-nya dibalikin sekali di response biar bisa
// disampein ke pedagangnya, gak disimpan di mana pun selain hash-nya.
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

// ImportPedagangBatch -- panggil CreatePedagangManual per baris. Satu
// baris gagal (mis. NIK udah kepake) TIDAK menggagalkan baris lain --
// errornya dikumpulin, bukan bikin seluruh proses import berhenti.
// Password per-baris gak dibalikin ke frontend (gak praktis buat
// banyak baris sekaligus) -- kalau perlu, pedagangnya reset password
// sendiri lewat "lupa password" pakai email yang didaftarin di file.
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
// 7. KECAMATAN & JALAN BARU -- tabel "Kecamatan" & "Jalan" di UI
// 4-tabel Ruas & Kuota.
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

// SumKuotaRuas -- total Kuota semua ruas (mj.ruas JSONB) milik 1 jalan,
// dipakai buat validasi pas UpdateJalanBaru: kapasitas baru gak boleh
// diturunkan sampai di bawah ini.
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

// UpdateJalanBaru -- edit kode/nama/kapasitas jalan yang sudah ada.
// Ruas & kuota event yang udah nempel di jalan ini TIDAK ikut berubah
// di sini -- validasi batas-bawah kapasitas baru dikerjain di usecase
// (pakai SumKuotaRuas & KuotaJalanUntukEvent) sebelum manggil ini.
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
// 8. HAPUS EVENT, KECAMATAN, JALAN -- soft-delete (isi deleted_at),
// gak ada migrasi baru yang dibutuhin.
// ============================================================

// DeleteEvent -- soft-delete cfd_sessions, sekalian lepas alokasi
// kuota per-jalan-nya (jalan_kapasitas_sesi) buat event ini. Riwayat
// kehadiran & klaim lapak (kehadiran_pedagang, lapak_klaim) SENGAJA
// gak disentuh -- tetap aman buat dilihat di tab Laporan.
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

// DeleteKecamatan -- soft-delete master_instansi, sekalian ikut
// soft-delete semua master_jalan yang ada di bawah kecamatan itu
// (ruas ikut "hilang" otomatis karena nempel di kolom jsonb jalan).
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
		// Alokasi kuota jalan ini di event mana pun ikut dilepas. Kalau
		// gak, SumKuotaJalanEvent masih ngitung kuota jalan yang udah
		// dihapus -- kuota event jadi "bocor" dan jalan baru bisa ditolak
		// padahal sebenarnya masih muat.
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

// DeleteJalanBaru -- soft-delete 1 master_jalan (ruas-nya ikut
// "hilang" karena nempel di kolom jsonb-nya sendiri).
func (r *Repository) DeleteJalanBaru(ctx context.Context, jalanID string) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx, `DELETE FROM jalan_instansi WHERE jalan_id = $1`, jalanID); err != nil {
		return err
	}

	// Lepas juga alokasi kuota jalan ini di event mana pun, biar kuota
	// event gak "bocor" ke jalan yang sudah dihapus (lihat catatan di
	// DeleteKecamatan).
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

// AssignJalanKeEventAktif -- upsert kuota 1 jalan ke event yang lagi
// aktif (siapa pun eventnya, ditentuin lewat GetActiveEventID). Kalau
// jalan itu udah punya kuota di event ini, kuotanya ditimpa (bukan
// ditambah); validasi total kuota jalan gak boleh lebih dari kuota
// total event ada di usecase, bukan di sini.
func (r *Repository) AssignJalanKeEventAktif(ctx context.Context, eventID, jalanID string, kuota int) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO jalan_kapasitas_sesi (jalan_id, session_id, kuota, terisi)
		VALUES ($1, $2, $3, 0)
		ON CONFLICT (jalan_id, session_id) DO UPDATE SET kuota = EXCLUDED.kuota, updated_at = now()
	`, jalanID, eventID, kuota)
	return err
}

// SumKuotaJalanEvent -- total kuota semua jalan yang UDAH di-assign ke
// 1 event, KECUALI 1 jalan tertentu (buat validasi "gak boleh lebih
// dari kuota total event" pas assign/update jalan itu).
func (r *Repository) SumKuotaJalanEvent(ctx context.Context, eventID string, kecualiJalanID string) (int, error) {
	var total int
	err := r.db.QueryRow(ctx, `
		SELECT COALESCE(SUM(kuota), 0) FROM jalan_kapasitas_sesi
		WHERE session_id = $1 AND jalan_id != $2
	`, eventID, kecualiJalanID).Scan(&total)
	return total, err
}