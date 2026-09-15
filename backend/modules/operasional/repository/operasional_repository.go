package repository

import (
	"context"
	"errors"
	"time"

	"cfd-backend/modules/operasional/entity"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type OperasionalRepository struct {
	db *pgxpool.Pool
}

func NewOperasionalRepository(db *pgxpool.Pool) *OperasionalRepository {
	return &OperasionalRepository{db: db}
}

// kolom disesuaikan dengan struktur migrasi 26
const sesiColumns = `
	id, nama_sesi, tanggal::text, jam_mulai::text, jam_selesai::text,
	jam_selesai_aktual::text, status, created_by, is_active, created_at, updated_at
`

func scanSesi(row pgx.Row) (*entity.Sesi, error) {
	var s entity.Sesi
	err := row.Scan(
		&s.ID, &s.NamaSesi, &s.Tanggal, &s.JamMulai, &s.JamSelesaiRencana,
		&s.JamSelesaiAktual, &s.Status, &s.CreatedBy, &s.IsActive,
		&s.CreatedAt, &s.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &s, nil
}

// GetSesiHariIni ambil sesi yang AKTIF hari ini (is_active = true).
// Ini fungsi "guard" -- dipakai buat cek "apa masih ada sesi yang lagi
// jalan" sebelum bikin/ubah/akhiri sesi (SimpanSesi, BukaSesiManual,
// AkhiriSesiLebihAwal, TickJadwalOtomatis). SENGAJA gak dipakai buat
// nampilin status ke petugas -- begitu sesi berakhir (is_active jadi
// false), fungsi ini balikin nil, padahal petugas masih perlu liat
// "Sudah Berakhir", bukan "belum ada sesi sama sekali". Buat itu pakai
// GetSesiHariIniUntukTampilan di bawah.
func (r *OperasionalRepository) GetSesiHariIni(ctx context.Context) (*entity.Sesi, error) {
	row := r.db.QueryRow(ctx, `
		SELECT `+sesiColumns+`
		FROM cfd_sessions
		WHERE tanggal = CURRENT_DATE AND is_active = true AND deleted_at IS NULL
	`)
	return scanSesi(row)
}

// GetSesiHariIniUntukTampilan ambil sesi hari ini APAPUN statusnya
// (aktif, udah berakhir, ditutup manual) -- dipakai KHUSUS buat kartu
// "Sesi CFD Hari Ini" di GetStatusOperasional, biar petugas tetap lihat
// "Sudah Berakhir" (bukan seolah gak ada sesi) begitu sesinya ditutup.
// Filter jam_mulai IS NOT NULL nyingkirin sesi auto-hidden (dari
// sesi.ResolveSesiHariIni) yang jamnya belum diisi petugas -- itu belum
// pantes ditampilin sebagai "sesi hari ini" ke petugas.
func (r *OperasionalRepository) GetSesiHariIniUntukTampilan(ctx context.Context) (*entity.Sesi, error) {
	row := r.db.QueryRow(ctx, `
		SELECT `+sesiColumns+`
		FROM cfd_sessions
		WHERE tanggal = CURRENT_DATE AND jam_mulai IS NOT NULL AND deleted_at IS NULL
		ORDER BY created_at DESC
		LIMIT 1
	`)
	return scanSesi(row)
}

// UpsertSesiHariIni: aktifkan sesi hari ini. Kalau belum ada baris
// cfd_sessions sama sekali buat hari ini -> insert baru. Kalau SUDAH ada
// (misal auto-created is_active=false gara-gara pedagang klaim lapak
// duluan sebelum petugas buka sesi) -> ADOPT baris itu (update jadi
// is_active=true + isi jam), JANGAN insert baris baru. Kalau dibiarkan
// insert baru, klaim pedagang yang udah nempel di baris lama bakal
// "terpisah" dari sesi yang dipakai checkout/scan-qr (lihat catatan di
// modules/shared/sesi.ResolveSesiHariIni).
//
// "Sudah diatur, tidak bisa diubah" sekarang berarti: sudah ADA sesi yang
// is_active=true hari ini (bukan sekadar ada barisnya).
func (r *OperasionalRepository) UpsertSesiHariIni(ctx context.Context, jamMulai, jamSelesai string, createdBy *string) (*entity.Sesi, error) {
	existingAktif, err := r.GetSesiHariIni(ctx)
	if err != nil {
		return nil, err
	}
	if existingAktif != nil {
		return nil, errors.New("sesi hari ini sudah diatur, tidak bisa diubah")
	}

	namaSesi := "CFD " + time.Now().Format("02 January 2006")

	row := r.db.QueryRow(ctx, `
		INSERT INTO cfd_sessions (
			nama_sesi, tanggal, jam_mulai, jam_selesai, status, created_by, is_active
		) VALUES ($1, CURRENT_DATE, $2, $3, 'aktif', $4, true)
		ON CONFLICT (tanggal) WHERE deleted_at IS NULL
		DO UPDATE SET
			jam_mulai          = EXCLUDED.jam_mulai,
			jam_selesai        = EXCLUDED.jam_selesai,
			jam_selesai_aktual = NULL,
			status             = 'aktif',
			created_by         = EXCLUDED.created_by,
			is_active          = true,
			updated_at         = now()
		RETURNING `+sesiColumns,
		namaSesi, jamMulai, jamSelesai, createdBy,
	)
	return scanSesi(row)
}

// BukaSesiManual: buka sesi sekarang, jam selesai default 23:59:59 hari
// ini. Dipakai buat toggle "Buka Sesi Sekarang" di petugas.
//
// Sama seperti UpsertSesiHariIni: kalau udah ada baris cfd_sessions buat
// hari ini (auto-created is_active=false), ADOPT baris itu lewat
// ON CONFLICT DO UPDATE -- jangan insert baris baru, biar sesi yang
// dipakai checkout/scan-qr tetap sesi yang SAMA dengan tempat klaim
// pedagang nempel.
func (r *OperasionalRepository) BukaSesiManual(ctx context.Context, jamMulai string, createdBy *string) (*entity.Sesi, error) {
	namaSesi := "CFD " + time.Now().Format("02 January 2006")

	row := r.db.QueryRow(ctx, `
		INSERT INTO cfd_sessions (
			nama_sesi, tanggal, jam_mulai, jam_selesai, status, created_by, is_active
		) VALUES ($1, CURRENT_DATE, $2, '23:59:59', 'aktif', $3, true)
		ON CONFLICT (tanggal) WHERE deleted_at IS NULL
		DO UPDATE SET
			jam_mulai          = EXCLUDED.jam_mulai,
			jam_selesai        = '23:59:59',
			jam_selesai_aktual = NULL,
			status             = 'aktif',
			created_by         = EXCLUDED.created_by,
			is_active          = true,
			updated_at         = now()
		RETURNING `+sesiColumns,
		namaSesi, jamMulai, createdBy,
	)
	return scanSesi(row)
}

// UpdateSesi: update jam mulai & selesai untuk sesi yang sudah ada (hanya jika is_active = true)
func (r *OperasionalRepository) UpdateSesi(ctx context.Context, id, jamMulai, jamSelesai string, updatedBy *string) (*entity.Sesi, error) {
	row := r.db.QueryRow(ctx, `
		UPDATE cfd_sessions
		SET jam_mulai = $1, jam_selesai = $2, updated_at = now()
		WHERE id = $3 AND deleted_at IS NULL AND is_active = true
		RETURNING `+sesiColumns,
		jamMulai, jamSelesai, id,
	)
	return scanSesi(row)
}

// AkhiriSesiLebihAwal: set status 'ditutup' dan jam_selesai_aktual = CURRENT_TIME
func (r *OperasionalRepository) AkhiriSesiLebihAwal(ctx context.Context, id string) (*entity.Sesi, error) {
	row := r.db.QueryRow(ctx, `
		UPDATE cfd_sessions
		SET status = 'ditutup', jam_selesai_aktual = CURRENT_TIME, is_active = false, updated_at = now()
		WHERE id = $1 AND deleted_at IS NULL AND is_active = true
		RETURNING `+sesiColumns,
		id,
	)
	return scanSesi(row)
}

// BatalkanKlaimBelumCheckIn dipanggil begitu sesi ditutup (manual lewat
// AkhiriSesiLebihAwal ATAUPUN otomatis lewat AutoSelesaikanSesi). Pedagang
// yang udah klaim lapak tapi BELUM sempat di-scan QR petugas (gak ada baris
// di kehadiran_pedagang) klaimnya ditandain 'batal' -- bukan dihapus, biar
// riwayatnya masih ada. Kalau nanti petugas buka sesi ini lagi
// (BukaSesiManual / UpsertSesiHariIni ngidupin ulang baris cfd_sessions
// yang sama), pedagang ini otomatis bisa klaim ulang karena constraint
// unique-nya cuma berlaku buat klaim berstatus 'aktif'
// (lihat migrasi 000027_add_status_lapak_klaim).
//
// Pedagang yang UDAH check-in gak disentuh sama sekali -- mereka tetap
// dianggap ikut CFD hari ini dan boleh checkout begitu sesi berakhir
// (lihat modules/pedagang/checkout).
func (r *OperasionalRepository) BatalkanKlaimBelumCheckIn(ctx context.Context, sessionID string) error {
	_, err := r.db.Exec(ctx, `
		UPDATE lapak_klaim
		SET status = 'batal'
		WHERE session_id = $1
		  AND status = 'aktif'
		  AND pedagang_id NOT IN (
			SELECT pedagang_id FROM kehadiran_pedagang
			WHERE session_id = $1 AND deleted_at IS NULL
		  )
	`, sessionID)
	return err
}

// ---- Jadwal Mingguan ----
func (r *OperasionalRepository) GetJadwalHariIni(ctx context.Context, hari entity.Hari) (*entity.JadwalMingguan, error) {
	var j entity.JadwalMingguan
	err := r.db.QueryRow(ctx, `
		SELECT id, hari, jam_mulai::text, jam_selesai_rencana::text, is_active, updated_by, created_at, updated_at
		FROM jadwal_mingguan
		WHERE hari = $1 AND is_active = true
	`, hari).Scan(&j.ID, &j.Hari, &j.JamMulai, &j.JamSelesaiRencana, &j.IsActive, &j.UpdatedBy, &j.CreatedAt, &j.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &j, nil
}

func (r *OperasionalRepository) AutoSelesaikanSesi(ctx context.Context, id, jamSelesai string) (*entity.Sesi, error) {
	row := r.db.QueryRow(ctx, `
		UPDATE cfd_sessions
		SET status = 'selesai', jam_selesai_aktual = $1, is_active = false, updated_at = now()
		WHERE id = $2 AND deleted_at IS NULL AND is_active = true
		RETURNING `+sesiColumns,
		jamSelesai, id,
	)
	return scanSesi(row)
}

func (r *OperasionalRepository) UpdateJadwalMingguan(ctx context.Context, hari entity.Hari, jamMulai, jamSelesaiRencana string, isActive bool, updatedBy *string) (*entity.JadwalMingguan, error) {
	var j entity.JadwalMingguan
	err := r.db.QueryRow(ctx, `
		INSERT INTO jadwal_mingguan (hari, jam_mulai, jam_selesai_rencana, is_active, updated_by)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (hari)
		DO UPDATE SET
			jam_mulai = EXCLUDED.jam_mulai,
			jam_selesai_rencana = EXCLUDED.jam_selesai_rencana,
			is_active = EXCLUDED.is_active,
			updated_by = EXCLUDED.updated_by,
			updated_at = now()
		RETURNING id, hari, jam_mulai::text, jam_selesai_rencana::text, is_active, updated_by, created_at, updated_at
	`, hari, jamMulai, jamSelesaiRencana, isActive, updatedBy,
	).Scan(&j.ID, &j.Hari, &j.JamMulai, &j.JamSelesaiRencana, &j.IsActive, &j.UpdatedBy, &j.CreatedAt, &j.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &j, nil
}

func (r *OperasionalRepository) ListJadwalMingguan(ctx context.Context) ([]entity.JadwalMingguan, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, hari, jam_mulai::text, jam_selesai_rencana::text, is_active, updated_by, created_at, updated_at
		FROM jadwal_mingguan
		ORDER BY
			CASE hari
				WHEN 'senin' THEN 1 WHEN 'selasa' THEN 2 WHEN 'rabu' THEN 3
				WHEN 'kamis' THEN 4 WHEN 'jumat' THEN 5 WHEN 'sabtu' THEN 6
				ELSE 7
			END
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []entity.JadwalMingguan
	for rows.Next() {
		var j entity.JadwalMingguan
		if err := rows.Scan(&j.ID, &j.Hari, &j.JamMulai, &j.JamSelesaiRencana, &j.IsActive, &j.UpdatedBy, &j.CreatedAt, &j.UpdatedAt); err != nil {
			return nil, err
		}
		list = append(list, j)
	}
	return list, rows.Err()
}

// ---- Pendaftaran ----
func (r *OperasionalRepository) GetPengaturanPendaftaran(ctx context.Context) (*entity.PengaturanPendaftaran, error) {
	var p entity.PengaturanPendaftaran
	err := r.db.QueryRow(ctx, `
		SELECT id, is_open, link_pendaftaran, jam_buka_pendaftaran::text, jam_tutup_pendaftaran::text, kode_event, updated_by, updated_at
		FROM pengaturan_pendaftaran
		LIMIT 1
	`).Scan(&p.ID, &p.IsOpen, &p.LinkPendaftaran, &p.JamBuka, &p.JamTutup, &p.KodeEvent, &p.UpdatedBy, &p.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *OperasionalRepository) UpdatePengaturanPendaftaran(ctx context.Context, isOpen bool, jamBuka, jamTutup *string, link *string, kodeEvent string, updatedBy *string) error {
	_, err := r.db.Exec(ctx, `
		UPDATE pengaturan_pendaftaran
		SET is_open = $1,
			jam_buka_pendaftaran = $2,
			jam_tutup_pendaftaran = $3,
			link_pendaftaran = $4,
			kode_event = $5,
			updated_by = $6,
			updated_at = now()
	`, isOpen, jamBuka, jamTutup, link, kodeEvent, updatedBy)
	return err
}

// ListRiwayat: ambil sesi yang sudah selesai (status 'selesai' atau 'ditutup' atau 'dibatalkan')
func (r *OperasionalRepository) ListRiwayat(ctx context.Context, limit int) ([]entity.Sesi, error) {
	rows, err := r.db.Query(ctx, `
		SELECT `+sesiColumns+`
		FROM cfd_sessions
		WHERE deleted_at IS NULL AND status IN ('selesai', 'ditutup', 'dibatalkan')
		ORDER BY tanggal DESC, jam_mulai DESC
		LIMIT $1
	`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []entity.Sesi
	for rows.Next() {
		s, err := scanSesi(rows)
		if err != nil {
			return nil, err
		}
		list = append(list, *s)
	}
	return list, rows.Err()
}

// ================================================================
// ===== SESI PER-WILAYAH (kota / kecamatan / jalan) =====
// ================================================================

// GetWilayahPetugas ambil kecamatan_id / jalan_id yang ditugaskan ke
// petugas (dari kolom users.kecamatan_id & users.jalan_id, migrasi 27).
// Kalau dua-duanya NULL, petugas dianggap bebas (boleh atur wilayah manapun).
func (r *OperasionalRepository) GetWilayahPetugas(ctx context.Context, userID string) (*entity.WilayahPetugasDTO, error) {
	var kecID, kecNama, jlnID, jlnNama *string
	err := r.db.QueryRow(ctx, `
		SELECT u.kecamatan_id, mi.nama_instansi, u.jalan_id, mj.nama_jalan
		FROM users u
		LEFT JOIN master_instansi mi ON mi.id = u.kecamatan_id
		LEFT JOIN master_jalan mj ON mj.id = u.jalan_id
		WHERE u.id = $1 AND u.deleted_at IS NULL
	`, userID).Scan(&kecID, &kecNama, &jlnID, &jlnNama)
	if err != nil {
		return nil, err
	}
	return &entity.WilayahPetugasDTO{
		KecamatanID:   kecID,
		KecamatanNama: kecNama,
		JalanID:       jlnID,
		JalanNama:     jlnNama,
		Bebas:         kecID == nil && jlnID == nil,
	}, nil
}

// ListSesiJalanRows ambil semua sesi (belum dihapus) beserta jalan-jalan
// yang tercakup di dalamnya (lewat jalan_kapasitas_sesi), dibatasi ke
// N hari terakhir + N hari ke depan biar gak berat. Grouping per sesi
// dan penentuan scope (kota/kecamatan/jalan) dilakukan di usecase.
func (r *OperasionalRepository) ListSesiJalanRows(ctx context.Context) ([]entity.SesiJalanRow, error) {
	rows, err := r.db.Query(ctx, `
		SELECT
			cs.id, cs.nama_sesi, cs.tanggal::text, cs.jam_mulai::text, cs.jam_selesai::text,
			cs.jam_selesai_aktual::text, cs.status, cs.is_active,
			mj.id, mj.nama_jalan, mi.id, mi.nama_instansi
		FROM cfd_sessions cs
		JOIN jalan_kapasitas_sesi jks ON jks.session_id = cs.id
		JOIN master_jalan mj ON mj.id = jks.jalan_id AND mj.deleted_at IS NULL
		LEFT JOIN jalan_instansi ji ON ji.jalan_id = mj.id
		LEFT JOIN master_instansi mi ON mi.id = ji.instansi_id
		WHERE cs.deleted_at IS NULL
			AND cs.jam_mulai IS NOT NULL
			AND cs.tanggal >= CURRENT_DATE - INTERVAL '30 days'
			AND cs.tanggal <= CURRENT_DATE + INTERVAL '30 days'
		ORDER BY cs.tanggal DESC, cs.jam_mulai DESC, mi.nama_instansi, mj.nama_jalan
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []entity.SesiJalanRow
	for rows.Next() {
		var row entity.SesiJalanRow
		if err := rows.Scan(
			&row.SesiID, &row.NamaSesi, &row.Tanggal, &row.JamMulai, &row.JamSelesaiRencana,
			&row.JamSelesaiAktual, &row.Status, &row.IsActive,
			&row.JalanID, &row.JalanNama, &row.KecamatanID, &row.KecamatanNama,
		); err != nil {
			return nil, err
		}
		list = append(list, row)
	}
	return list, rows.Err()
}

// JalanUntukScope ambil daftar jalan_id yang perlu di-link ke sesi baru,
// sesuai cakupan yang dipilih petugas.
func (r *OperasionalRepository) JalanUntukScope(ctx context.Context, scope string, kecamatanID, jalanID *string) ([]string, error) {
	var rows pgx.Rows
	var err error
	switch scope {
	case entity.ScopeKota:
		rows, err = r.db.Query(ctx, `SELECT id FROM master_jalan WHERE deleted_at IS NULL`)
	case entity.ScopeKecamatan:
		rows, err = r.db.Query(ctx, `
			SELECT mj.id FROM master_jalan mj
			JOIN jalan_instansi ji ON ji.jalan_id = mj.id
			WHERE ji.instansi_id = $1 AND mj.deleted_at IS NULL
		`, kecamatanID)
	case entity.ScopeJalan:
		return []string{*jalanID}, nil
	default:
		return nil, errors.New("scope tidak valid")
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var ids []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	return ids, rows.Err()
}

// CreateSesiWilayah insert sesi CFD baru + link ke jalan-jalan sesuai
// cakupannya (jalan_kapasitas_sesi), dalam 1 transaksi.
func (r *OperasionalRepository) CreateSesiWilayah(
	ctx context.Context,
	namaSesi, tanggal, jamMulai, jamSelesai string,
	createdBy *string,
	jalanIDs []string,
) (*entity.Sesi, error) {
	if len(jalanIDs) == 0 {
		return nil, errors.New("tidak ada jalan yang tercakup di wilayah ini")
	}

	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	// ON CONFLICT: sama pola kayak UpsertSesiHariIni/BukaSesiManual di atas
	// -- kalau tanggal ini udah punya baris cfd_sessions (mis. baris
	// auto-hidden yang dibikin sesi.ResolveSesiHariIni pas ada pedagang
	// klaim/generate-slot duluan), ADOPT baris itu, jangan insert baris
	// baru. WAJIB begitu unique index uq_cfd_sessions_tanggal aktif --
	// insert polos ke tanggal yang udah kepakai bakal gagal 23505.
	row := tx.QueryRow(ctx, `
		INSERT INTO cfd_sessions (
			nama_sesi, tanggal, jam_mulai, jam_selesai, status, created_by, is_active
		) VALUES ($1, $2, $3, $4, 'aktif', $5, true)
		ON CONFLICT (tanggal) WHERE deleted_at IS NULL
		DO UPDATE SET
			nama_sesi   = EXCLUDED.nama_sesi,
			jam_mulai   = EXCLUDED.jam_mulai,
			jam_selesai = EXCLUDED.jam_selesai,
			status      = 'aktif',
			created_by  = EXCLUDED.created_by,
			is_active   = true,
			updated_at  = now()
		RETURNING `+sesiColumns,
		namaSesi, tanggal, jamMulai, jamSelesai, createdBy,
	)
	sesi, err := scanSesi(row)
	if err != nil {
		return nil, err
	}

	for _, jalanID := range jalanIDs {
		if _, err := tx.Exec(ctx, `
			INSERT INTO jalan_kapasitas_sesi (jalan_id, session_id, terisi)
			VALUES ($1, $2, 0)
			ON CONFLICT (jalan_id, session_id) DO NOTHING
		`, jalanID, sesi.ID); err != nil {
			return nil, err
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return sesi, nil
}

// HapusSesiWilayah soft-delete sesi CFD. Baris jalan_kapasitas_sesi
// terkait dibiarkan apa adanya -- otomatis tidak lagi ikut kehitung
// di manapun karena semua query (ListSesiJalanRows, GetSesiHariIni, dll)
// selalu join/filter cfd_sessions WHERE deleted_at IS NULL.
func (r *OperasionalRepository) HapusSesiWilayah(ctx context.Context, id string) error {
	tag, err := r.db.Exec(ctx, `
		UPDATE cfd_sessions
		SET deleted_at = now(), updated_at = now()
		WHERE id = $1 AND deleted_at IS NULL
	`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return errors.New("sesi tidak ditemukan atau sudah dihapus")
	}
	return nil
}