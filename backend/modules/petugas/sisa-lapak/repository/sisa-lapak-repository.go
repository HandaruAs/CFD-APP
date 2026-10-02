package repository

import (
	"context"
	"errors"

	"cfd-backend/modules/petugas/sisa-lapak/entity"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	db *pgxpool.Pool
}

func terjemahkanError(err error) error {
	if err == nil {
		return nil
	}
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23505" {
		if pgErr.ConstraintName == "master_jalan_kode_jalan_key" {
			return errors.New("kode jalan ini sudah dipakai jalan lain, silakan gunakan kode yang berbeda")
		}
		return errors.New("data ini sudah ada, silakan periksa kembali isian kamu")
	}
	return err
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

// GetSisaLapak: semua jalan (data master) + keterisian hari ini dari data
// EVENT. terisi = pedagang yang ikut event hari ini (WIB) di titik lokasi
// jalan itu; kuotaHariIni = kapasitas titik-titik event hari ini di jalan
// itu. Event draft & dibatalkan tidak dihitung.
//
// Dulu angka terisi diambil dari sesi lama (cfd_sessions) lewat
// ResolveSesiHariIni, yang juga diam-diam MEMBUAT sesi lama kalau belum
// ada -- sekarang tidak lagi.
func (r *Repository) GetSisaLapak(ctx context.Context) ([]entity.KecamatanData, error) {
	query := `
		WITH hari_ini AS (
			SELECT el.id AS lapak_id, r.jalan_id, el.kapasitas
			FROM event_lapak el
			JOIN events e ON e.id = el.event_id
			JOIN master_ruas r ON r.id = el.ruas_id
			WHERE el.deleted_at IS NULL AND e.deleted_at IS NULL
			  AND e.status NOT IN ('draft', 'dibatalkan')
			  AND e.tanggal = (now() AT TIME ZONE 'Asia/Jakarta')::date
		),
		per_jalan AS (
			SELECT h.jalan_id,
			       SUM(h.kapasitas)::int AS kuota_hari_ini,
			       (SELECT COUNT(*) FROM event_participants p
			        WHERE p.event_lapak_id = ANY(array_agg(h.lapak_id))
			          AND p.status <> 'batal' AND p.deleted_at IS NULL)::int AS terisi
			FROM hari_ini h
			GROUP BY h.jalan_id
		)
		SELECT
			mi.id AS kecamatan_id,
			COALESCE(mi.nama_instansi, 'Tanpa Kecamatan') AS kecamatan,
			mj.id,
			mj.kode_jalan,
			mj.nama_jalan,
			mj.kapasitas AS kuota,
			COALESCE(pj.terisi, 0) AS terisi,
			COALESCE(pj.kuota_hari_ini, 0) AS kuota_hari_ini
		FROM master_jalan mj
		LEFT JOIN jalan_instansi ji ON mj.id = ji.jalan_id
		LEFT JOIN master_instansi mi ON ji.instansi_id = mi.id
		LEFT JOIN per_jalan pj ON pj.jalan_id = mj.id
		WHERE mj.deleted_at IS NULL
		ORDER BY mi.nama_instansi, mj.nama_jalan
	`
	rows, err := r.db.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	mapData := make(map[string][]entity.JalanData)
	kecIDData := make(map[string]*string)
	var urutanKecamatan []string
	for rows.Next() {
		var kecID *string
		var kec, id, kodeJalan, namaJalan string
		var kuota, terisi, kuotaHariIni int
		if err := rows.Scan(&kecID, &kec, &id, &kodeJalan, &namaJalan, &kuota, &terisi, &kuotaHariIni); err != nil {
			return nil, err
		}
		if _, sudahAda := mapData[kec]; !sudahAda {
			urutanKecamatan = append(urutanKecamatan, kec)
			kecIDData[kec] = kecID
		}
		mapData[kec] = append(mapData[kec], entity.JalanData{
			ID:        id,
			KodeJalan: kodeJalan,
			Nama:      namaJalan,
			Kuota:        kuota,
			Terisi:       terisi,
			KuotaHariIni: kuotaHariIni,
		})
	}

	var result []entity.KecamatanData
	for _, kec := range urutanKecamatan {
		result = append(result, entity.KecamatanData{
			KecamatanID: kecIDData[kec],
			Kecamatan:   kec,
			Jalan:       mapData[kec],
		})
	}
	return result, nil
}

func (r *Repository) CreateJalan(ctx context.Context, kodeJalan, namaJalan string, kapasitas int, instansiID string) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	var jalanID string
	err = tx.QueryRow(ctx, `
		INSERT INTO master_jalan (id, kode_jalan, nama_jalan, kapasitas)
		VALUES (gen_random_uuid(), $1, $2, $3)
		RETURNING id
	`, kodeJalan, namaJalan, kapasitas).Scan(&jalanID)
	if err != nil {
		return terjemahkanError(err)
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO jalan_instansi (jalan_id, instansi_id)
		VALUES ($1, $2)
	`, jalanID, instansiID)
	if err != nil {
		return err
	}

	return tx.Commit(ctx)
}

func (r *Repository) UpdateJalan(ctx context.Context, id, kodeJalan, namaJalan string, kapasitas int) error {
	_, err := r.db.Exec(ctx, `
		UPDATE master_jalan
		SET kode_jalan = $1, nama_jalan = $2, kapasitas = $3, updated_at = now()
		WHERE id = $4 AND deleted_at IS NULL
	`, kodeJalan, namaJalan, kapasitas, id)
	return terjemahkanError(err)
}

func (r *Repository) DeleteJalan(ctx context.Context, id string) error {
	_, err := r.db.Exec(ctx, `
		UPDATE master_jalan
		SET deleted_at = now()
		WHERE id = $1 AND deleted_at IS NULL
	`, id)
	return err
}

func (r *Repository) InstansiExists(ctx context.Context, id string) (bool, error) {
	var exists bool
	err := r.db.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1 FROM master_instansi
			WHERE id = $1 AND deleted_at IS NULL
		)
	`, id).Scan(&exists)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return false, nil
		}
		return false, err
	}
	return exists, nil
}

func (r *Repository) GetAllInstansi(ctx context.Context) ([]entity.InstansiData, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, nama_instansi FROM master_instansi WHERE deleted_at IS NULL ORDER BY nama_instansi
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []entity.InstansiData
	for rows.Next() {
		var id, nama string
		if err := rows.Scan(&id, &nama); err != nil {
			return nil, err
		}
		result = append(result, entity.InstansiData{ID: id, Nama: nama})
	}
	return result, nil
}