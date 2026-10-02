package repository

import (
	"context"
	"fmt"

	"cfd-backend/modules/petugas/laporan/entity"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Laporan kehadiran sekarang membaca data EVENT (event_participants),
// bukan tabel sistem lama (kehadiran_pedagang / lapak_klaim / cfd_sessions).
// Bentuk response sengaja tetap sama supaya web & mobile tidak perlu ganti
// kontrak. Satu baris = satu pedagang yang ikut satu event (yang batal tidak
// dihitung); "belum-hadir" = sudah dapat lapak tapi belum check-in.
// Rentang tanggal memakai TANGGAL EVENT. eventID (opsional) mempersempit ke
// satu event.

type LaporanRepository interface {
	GetKehadiranByDateRange(ctx context.Context, startDate, endDate, eventID, search string, page, limit int) ([]entity.KehadiranItem, int, error)
	GetStatsKehadiran(ctx context.Context, startDate, endDate, eventID string) (*entity.StatsResponse, error)
	GetDetailKehadiran(ctx context.Context, kehadiranID string) (*entity.DetailKehadiranRaw, error)
}

type laporanRepository struct {
	db *pgxpool.Pool
}

func NewLaporanRepository(db *pgxpool.Pool) LaporanRepository {
	return &laporanRepository{db: db}
}

// filterPeserta: kondisi bersama untuk daftar, jumlah, dan statistik.
// $1 = tanggal mulai, $2 = tanggal selesai, $3 = event id (boleh kosong).
const filterPeserta = `
	ep.deleted_at IS NULL
	AND ep.status <> 'batal'
	AND e.deleted_at IS NULL
	AND e.tanggal BETWEEN $1::date AND $2::date
	AND ($3 = '' OR e.id::text = $3)
`

const fromPeserta = `
	FROM event_participants ep
	JOIN events e             ON e.id = ep.event_id
	JOIN pedagang_profiles p  ON p.id = ep.pedagang_id
	JOIN users u              ON u.id = p.user_id
	JOIN event_lapak el       ON el.id = ep.event_lapak_id
	JOIN master_ruas r        ON r.id = el.ruas_id
	JOIN master_jalan mj      ON mj.id = r.jalan_id
`

const statusLaporan = `
	CASE
		WHEN ep.check_out_at IS NOT NULL THEN 'check-out'
		WHEN ep.check_in_at IS NOT NULL THEN 'check-in'
		ELSE 'belum-hadir'
	END
`

func (r *laporanRepository) GetKehadiranByDateRange(ctx context.Context, startDate, endDate, eventID, search string, page, limit int) ([]entity.KehadiranItem, int, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 20
	}
	offset := (page - 1) * limit

	args := []any{startDate, endDate, eventID}
	searchFilter := ""
	if search != "" {
		searchFilter = `AND (p.nama_usaha ILIKE '%' || $4 || '%' OR u.name ILIKE '%' || $4 || '%'
		                 OR p.nama_lengkap ILIKE '%' || $4 || '%')`
		args = append(args, search)
	}
	n := len(args)

	query := fmt.Sprintf(`
		SELECT
			ep.id,
			ep.pedagang_id,
			COALESCE(p.nama_usaha, ''),
			COALESCE(NULLIF(p.nama_lengkap, ''), u.name, ''),
			COALESCE(
				NULLIF(UPPER(SUBSTRING(COALESCE(NULLIF(p.nama_lengkap, ''), u.name), 1, 1)) ||
				       UPPER(SUBSTRING(SPLIT_PART(COALESCE(NULLIF(p.nama_lengkap, ''), u.name), ' ', 2), 1, 1)), ''),
				'??'
			),
			COALESCE(p.jenis_dagangan::text, ''),
			-- "Jalan Darmo · Ruas 2 / No. 7 (CFD Genteng)"
			mj.nama_jalan || ' · ' || r.nama_ruas || ' / No. ' || ep.nomor || ' (' || e.nama || ')',
			COALESCE(TO_CHAR(ep.check_in_at AT TIME ZONE 'Asia/Jakarta', 'HH24:MI'), '-'),
			TO_CHAR(ep.check_out_at AT TIME ZONE 'Asia/Jakarta', 'HH24:MI'),
			ep.omset,
			'Scan QR',
			%s
		%s
		WHERE %s %s
		ORDER BY e.tanggal DESC, ep.check_in_at DESC NULLS LAST, e.jam_mulai, mj.nama_jalan, ep.nomor
		LIMIT $%d OFFSET $%d
	`, statusLaporan, fromPeserta, filterPeserta, searchFilter, n+1, n+2)

	rows, err := r.db.Query(ctx, query, append(args, limit, offset)...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	items := make([]entity.KehadiranItem, 0)
	for rows.Next() {
		var item entity.KehadiranItem
		if err := rows.Scan(
			&item.ID, &item.PedagangID, &item.NamaUsaha, &item.Pemilik, &item.Inisial,
			&item.Kategori, &item.LokasiLapak, &item.WaktuCheckin, &item.WaktuCheckout,
			&item.Omset, &item.Metode, &item.Status,
		); err != nil {
			return nil, 0, err
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, err
	}

	var total int
	countQuery := fmt.Sprintf(`SELECT COUNT(*) %s WHERE %s %s`, fromPeserta, filterPeserta, searchFilter)
	if err := r.db.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}
	return items, total, nil
}

// GetStatsKehadiran:
//   - totalTerdaftar = pedagang yang dapat lapak di event dalam rentang (tidak batal)
//   - totalCheckin   = yang sudah check-in (termasuk yang sudah check-out)
//   - totalCheckout  = yang sudah check-out
//   - omset          = dari yang sudah check-out
//   - lapakTerisi    = sama dengan totalTerdaftar (setiap peserta memegang 1 lapak)
func (r *laporanRepository) GetStatsKehadiran(ctx context.Context, startDate, endDate, eventID string) (*entity.StatsResponse, error) {
	query := fmt.Sprintf(`
		SELECT
			COUNT(*)::int,
			COUNT(*) FILTER (WHERE ep.check_in_at IS NOT NULL)::int,
			COUNT(*) FILTER (WHERE ep.check_out_at IS NOT NULL)::int,
			COALESCE(SUM(ep.omset), 0)::bigint,
			COALESCE(ROUND(AVG(ep.omset)), 0)::bigint,
			CASE WHEN COUNT(*) > 0
			     THEN ROUND(COUNT(*) FILTER (WHERE ep.check_in_at IS NOT NULL)::numeric / COUNT(*) * 100, 2)
			     ELSE 0 END::float8,
			COUNT(*)::int
		FROM event_participants ep
		JOIN events e ON e.id = ep.event_id
		WHERE %s
	`, filterPeserta)

	var s entity.StatsResponse
	if err := r.db.QueryRow(ctx, query, startDate, endDate, eventID).Scan(
		&s.TotalTerdaftar, &s.TotalCheckin, &s.TotalCheckout,
		&s.TotalOmset, &s.RataOmset, &s.PersenHadir, &s.LapakTerisi,
	); err != nil {
		return nil, err
	}
	return &s, nil
}

// GetDetailKehadiran: 1 baris laporan (id = id keikutsertaan). nil, nil
// kalau tidak ditemukan.
func (r *laporanRepository) GetDetailKehadiran(ctx context.Context, kehadiranID string) (*entity.DetailKehadiranRaw, error) {
	var d entity.DetailKehadiranRaw
	err := r.db.QueryRow(ctx, `
		SELECT
			ep.id,
			e.tanggal::text,
			e.nama,
			COALESCE(TO_CHAR(ep.check_in_at AT TIME ZONE 'Asia/Jakarta', 'HH24:MI'), '-'),
			TO_CHAR(ep.check_out_at AT TIME ZONE 'Asia/Jakarta', 'HH24:MI'),
			ep.omset,
			`+statusLaporan+`,
			COALESCE(petugas.name, ''),
			mj.nama_jalan || ' · ' || r.nama_ruas,
			COALESCE((
				SELECT STRING_AGG(mi.nama_instansi, ', ' ORDER BY mi.nama_instansi)
				FROM jalan_instansi ji
				JOIN master_instansi mi ON mi.id = ji.instansi_id AND mi.deleted_at IS NULL
				WHERE ji.jalan_id = mj.id
			), ''),
			ep.nomor::text,
			COALESCE(p.lokasi_lapak, ''),
			COALESCE(p.nama_usaha, ''),
			COALESCE(p.jenis_dagangan::text, ''),
			COALESCE(p.jenis_lapak::text, ''),
			COALESCE(NULLIF(p.nama_lengkap, ''), u.name, ''),
			COALESCE(p.nik, ''),
			COALESCE(u.email, ''),
			COALESCE(p.tanggal_lahir::text, ''),
			ep.kategori::text
		`+fromPeserta+`
		LEFT JOIN users petugas ON petugas.id = ep.check_in_by
		WHERE ep.id = $1 AND ep.deleted_at IS NULL
	`, kehadiranID).Scan(
		&d.KehadiranID, &d.Tanggal, &d.NamaSesi, &d.WaktuCheckin, &d.WaktuCheckout,
		&d.Omset, &d.Status, &d.DicatatOleh,
		&d.NamaJalan, &d.Kecamatan, &d.NomorLapak, &d.LokasiLapak,
		&d.NamaUsaha, &d.JenisDagangan, &d.JenisLapak,
		&d.NamaLengkap, &d.NIK, &d.Email, &d.TanggalLahir,
		&d.StatusPedagang,
	)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &d, nil
}