package repository

import (
	"context"
	"time"

	"cfd-backend/modules/admin/dashboard/entity"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Dashboard membaca data EVENT (events, event_lapak, event_participants),
// bukan tabel sistem lama. Satu hari boleh punya banyak event, jadi angka
// "hari ini" dijumlah untuk semua event di tanggal hari ini (WIB).

// EventRow: 1 event hari ini beserta angka-angkanya (mentah; status &
// sisa menit diolah di usecase).
type EventRow struct {
	ID         string
	Nama       string
	Status     string // enum event_status
	JamMulai   string // HH:MM
	JamSelesai string // HH:MM
	MulaiAt    time.Time
	SelesaiAt  time.Time
	Titik      int
	Kapasitas  int // kuota event
	Klaim      int
	CheckIn    int
	CheckOut   int
	Omset      int64
}

type DashboardRepository interface {
	GetEventHariIni(ctx context.Context) ([]EventRow, error)
	GetTrenSesi(ctx context.Context, jumlah int) ([]entity.TrenSesi, error)
	GetTrenMinggu(ctx context.Context, jumlahMinggu int) ([]entity.TrenMinggu, error)
}

type dashboardRepository struct {
	db *pgxpool.Pool
}

func NewDashboardRepository(db *pgxpool.Pool) DashboardRepository {
	return &dashboardRepository{db: db}
}

const hariIniWIB = `(now() AT TIME ZONE 'Asia/Jakarta')::date`

// GetEventHariIni: semua event hari ini kecuali draft (belum diterbitkan).
func (r *dashboardRepository) GetEventHariIni(ctx context.Context) ([]EventRow, error) {
	rows, err := r.db.Query(ctx, `
		SELECT
			e.id, e.nama, e.status::text,
			to_char(e.jam_mulai, 'HH24:MI'), to_char(e.jam_selesai, 'HH24:MI'),
			((e.tanggal + e.jam_mulai) AT TIME ZONE 'Asia/Jakarta'),
			((e.tanggal + e.jam_selesai) AT TIME ZONE 'Asia/Jakarta'),
			(SELECT COUNT(*) FROM event_lapak el WHERE el.event_id = e.id AND el.deleted_at IS NULL)::int,
			e.kuota_total,
			COUNT(ep.id) FILTER (WHERE ep.status <> 'batal')::int,
			COUNT(ep.id) FILTER (WHERE ep.check_in_at IS NOT NULL)::int,
			COUNT(ep.id) FILTER (WHERE ep.check_out_at IS NOT NULL)::int,
			COALESCE(SUM(ep.omset), 0)::bigint
		FROM events e
		LEFT JOIN event_participants ep ON ep.event_id = e.id AND ep.deleted_at IS NULL
		WHERE e.deleted_at IS NULL
		  AND e.status <> 'draft'
		  AND e.tanggal = `+hariIniWIB+`
		GROUP BY e.id
		ORDER BY e.jam_mulai, e.nama
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := make([]EventRow, 0)
	for rows.Next() {
		var e EventRow
		if err := rows.Scan(&e.ID, &e.Nama, &e.Status, &e.JamMulai, &e.JamSelesai, &e.MulaiAt, &e.SelesaiAt,
			&e.Titik, &e.Kapasitas, &e.Klaim, &e.CheckIn, &e.CheckOut, &e.Omset); err != nil {
			return nil, err
		}
		list = append(list, e)
	}
	return list, rows.Err()
}

// GetTrenSesi: N event terakhir (s/d hari ini) yang sudah diterbitkan dan
// tidak dibatalkan. Klaim = pedagang yang dapat lapak (tidak batal),
// hadir = yang check-in.
func (r *dashboardRepository) GetTrenSesi(ctx context.Context, jumlah int) ([]entity.TrenSesi, error) {
	rows, err := r.db.Query(ctx, `
		SELECT * FROM (
			SELECT
				e.id,
				e.tanggal::text,
				e.nama,
				COUNT(ep.id) FILTER (WHERE ep.status <> 'batal')::int,
				COUNT(ep.id) FILTER (WHERE ep.check_in_at IS NOT NULL)::int,
				COALESCE(SUM(ep.omset), 0)::bigint,
				e.jam_mulai::text
			FROM events e
			LEFT JOIN event_participants ep ON ep.event_id = e.id AND ep.deleted_at IS NULL
			WHERE e.deleted_at IS NULL
			  AND e.status NOT IN ('draft', 'dibatalkan')
			  AND e.tanggal <= `+hariIniWIB+`
			GROUP BY e.id
			ORDER BY e.tanggal DESC, e.jam_mulai DESC
			LIMIT $1
		) t
		ORDER BY 2 ASC, 7 ASC
	`, jumlah)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := []entity.TrenSesi{}
	for rows.Next() {
		var t entity.TrenSesi
		var jamMulai string
		if err := rows.Scan(&t.SesiID, &t.Tanggal, &t.NamaSesi, &t.Klaim, &t.Hadir, &t.Omset, &jamMulai); err != nil {
			return nil, err
		}
		result = append(result, t)
	}
	return result, rows.Err()
}

// GetTrenMinggu: jumlah pedagang terdaftar per minggu (Senin-Minggu, WIB),
// N minggu terakhir termasuk minggu ini. Lama/baru dari kolom kategori.
func (r *dashboardRepository) GetTrenMinggu(ctx context.Context, jumlahMinggu int) ([]entity.TrenMinggu, error) {
	rows, err := r.db.Query(ctx, `
		WITH minggu AS (
			SELECT generate_series(
				date_trunc('week', `+hariIniWIB+`::timestamp) - make_interval(weeks => $1 - 1),
				date_trunc('week', `+hariIniWIB+`::timestamp),
				interval '1 week'
			) AS mulai
		),
		ped AS (
			SELECT (p.created_at AT TIME ZONE 'Asia/Jakarta') AS dibuat, p.kategori
			FROM pedagang_profiles p
			JOIN users u ON u.id = p.user_id AND u.deleted_at IS NULL
			WHERE p.deleted_at IS NULL
		)
		SELECT
			m.mulai::date::text,
			COUNT(ped.dibuat) FILTER (
				WHERE ped.dibuat >= m.mulai AND ped.dibuat < m.mulai + interval '1 week' AND ped.kategori = 'baru'
			)::int,
			COUNT(ped.dibuat) FILTER (
				WHERE ped.dibuat >= m.mulai AND ped.dibuat < m.mulai + interval '1 week' AND ped.kategori = 'lama'
			)::int,
			COUNT(ped.dibuat) FILTER (WHERE ped.dibuat < m.mulai + interval '1 week')::int
		FROM minggu m
		LEFT JOIN ped ON true
		GROUP BY m.mulai
		ORDER BY m.mulai
	`, jumlahMinggu)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := []entity.TrenMinggu{}
	for rows.Next() {
		var t entity.TrenMinggu
		if err := rows.Scan(&t.MingguMulai, &t.Baru, &t.Lama, &t.Total); err != nil {
			return nil, err
		}
		result = append(result, t)
	}
	return result, rows.Err()
}