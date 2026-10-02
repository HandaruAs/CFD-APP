package repository

import (
	"context"

	"cfd-backend/modules/event-info/entity"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Data ringkas event untuk beranda (publik, tanpa login) dan dashboard
// petugas. Event draft tidak pernah ikut.
type EventInfoRepository struct {
	db *pgxpool.Pool
}

func NewEventInfoRepository(db *pgxpool.Pool) *EventInfoRepository {
	return &EventInfoRepository{db: db}
}

// ListEvent: event dari tanggal hari ini (WIB) s/d hari ini + hariKeDepan.
// termasukBatal=false menyaring event yang dibatalkan.
func (r *EventInfoRepository) ListEvent(ctx context.Context, hariKeDepan int, termasukBatal bool) ([]entity.EventInfo, error) {
	rows, err := r.db.Query(ctx, `
		SELECT e.id, e.nama, e.tanggal::text,
		       to_char(e.jam_mulai, 'HH24:MI'), to_char(e.jam_selesai, 'HH24:MI'),
		       e.status::text, e.pendaftaran_buka_at, e.pendaftaran_tutup_at,
		       ((e.tanggal + e.jam_mulai) AT TIME ZONE 'Asia/Jakarta'),
		       ((e.tanggal + e.jam_selesai) AT TIME ZONE 'Asia/Jakarta'),
		       k.kuota_total, k.kuota_lama, k.kuota_baru,
		       (k.terisi_lama + k.terisi_baru),
		       (SELECT COUNT(*) FROM event_participants p
		        WHERE p.event_id = e.id AND p.deleted_at IS NULL AND p.check_in_at IS NOT NULL)::int,
		       (SELECT COUNT(*) FROM event_participants p
		        WHERE p.event_id = e.id AND p.deleted_at IS NULL AND p.check_out_at IS NOT NULL)::int
		FROM events e
		JOIN v_event_kuota k ON k.event_id = e.id
		WHERE e.deleted_at IS NULL
		  AND e.status <> 'draft'
		  AND ($2 OR e.status <> 'dibatalkan')
		  AND e.tanggal BETWEEN (now() AT TIME ZONE 'Asia/Jakarta')::date
		                    AND (now() AT TIME ZONE 'Asia/Jakarta')::date + $1::int
		ORDER BY e.tanggal, e.jam_mulai, e.nama`, hariKeDepan, termasukBatal)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := make([]entity.EventInfo, 0)
	ids := make([]string, 0)
	for rows.Next() {
		var e entity.EventInfo
		if err := rows.Scan(&e.ID, &e.Nama, &e.Tanggal, &e.JamMulai, &e.JamSelesai,
			&e.StatusAsli, &e.PendaftaranBukaAt, &e.PendaftaranTutupAt, &e.MulaiAt, &e.SelesaiAt,
			&e.KuotaTotal, &e.KuotaLama, &e.KuotaBaru, &e.Terisi, &e.CheckIn, &e.CheckOut); err != nil {
			return nil, err
		}
		e.Lokasi = []entity.LokasiInfo{}
		list = append(list, e)
		ids = append(ids, e.ID)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if len(ids) == 0 {
		return list, nil
	}

	// Lokasi per event, dikelompokkan per jalan.
	lrows, err := r.db.Query(ctx, `
		SELECT el.event_id, kec.nama_instansi, j.nama_jalan,
		       COUNT(*)::int, SUM(el.kapasitas)::int
		FROM event_lapak el
		JOIN master_ruas r  ON r.id = el.ruas_id
		JOIN master_jalan j ON j.id = r.jalan_id
		LEFT JOIN LATERAL (
			SELECT mi.nama_instansi
			FROM jalan_instansi ji
			JOIN master_instansi mi ON mi.id = ji.instansi_id AND mi.deleted_at IS NULL
			WHERE ji.jalan_id = j.id
			LIMIT 1
		) kec ON true
		WHERE el.deleted_at IS NULL AND el.event_id = ANY($1::uuid[])
		GROUP BY el.event_id, kec.nama_instansi, j.id
		ORDER BY kec.nama_instansi NULLS LAST, j.nama_jalan`, ids)
	if err != nil {
		return nil, err
	}
	defer lrows.Close()
	idx := map[string]int{}
	for i, e := range list {
		idx[e.ID] = i
	}
	for lrows.Next() {
		var eventID string
		var l entity.LokasiInfo
		if err := lrows.Scan(&eventID, &l.Kecamatan, &l.NamaJalan, &l.JumlahRuas, &l.Kapasitas); err != nil {
			return nil, err
		}
		if i, ok := idx[eventID]; ok {
			list[i].Lokasi = append(list[i].Lokasi, l)
		}
	}
	return list, lrows.Err()
}

// ListPilihan: event (selain draft) dengan tanggal dalam rentang, untuk
// dropdown filter laporan. Event dibatalkan ikut, supaya laporannya tetap
// bisa dilihat.
func (r *EventInfoRepository) ListPilihan(ctx context.Context, mulai, selesai string) ([]entity.EventPilihan, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, nama, tanggal::text, to_char(jam_mulai, 'HH24:MI'), to_char(jam_selesai, 'HH24:MI'), status::text
		FROM events
		WHERE deleted_at IS NULL AND status <> 'draft'
		  AND tanggal BETWEEN $1::date AND $2::date
		ORDER BY tanggal DESC, jam_mulai, nama`, mulai, selesai)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	list := make([]entity.EventPilihan, 0)
	for rows.Next() {
		var e entity.EventPilihan
		if err := rows.Scan(&e.ID, &e.Nama, &e.Tanggal, &e.JamMulai, &e.JamSelesai, &e.Status); err != nil {
			return nil, err
		}
		list = append(list, e)
	}
	return list, rows.Err()
}