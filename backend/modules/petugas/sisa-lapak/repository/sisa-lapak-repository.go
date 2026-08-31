package repository

import (
	"context"
	"errors"

	"cfd-backend/modules/petugas/sisa-lapak/entity"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

// GetSisaLapak ambil data kuota + terisi + id & kode_jalan
func (r *Repository) GetSisaLapak(ctx context.Context) ([]entity.KecamatanData, error) {
	// Cari sesi aktif hari ini
	var sessionID string
	err := r.db.QueryRow(ctx, `
		SELECT id FROM cfd_sessions
		WHERE tanggal = CURRENT_DATE AND is_active = true AND deleted_at IS NULL
		LIMIT 1
	`).Scan(&sessionID)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return nil, err
	}

	query := `
		SELECT 
			COALESCE(mi.nama_unit, 'Tanpa Kecamatan') AS kecamatan,
			mj.id,
			mj.kode_jalan,
			mj.nama_jalan,
			mj.kapasitas AS kuota,
			COALESCE(jks.terisi, 0) AS terisi
		FROM master_jalan mj
		LEFT JOIN jalan_instansi ji ON mj.id = ji.jalan_id
		LEFT JOIN master_instansi mi ON ji.instansi_id = mi.id
		LEFT JOIN jalan_kapasitas_sesi jks ON mj.id = jks.jalan_id AND jks.session_id = $1
		WHERE mj.deleted_at IS NULL
		ORDER BY mi.nama_unit, mj.nama_jalan
	`
	rows, err := r.db.Query(ctx, query, sessionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	mapData := make(map[string][]entity.JalanData)
	for rows.Next() {
		var kec, id, kodeJalan, namaJalan string
		var kuota, terisi int
		if err := rows.Scan(&kec, &id, &kodeJalan, &namaJalan, &kuota, &terisi); err != nil {
			return nil, err
		}
		mapData[kec] = append(mapData[kec], entity.JalanData{
			ID:         id,
			KodeJalan:  kodeJalan,
			Nama:       namaJalan,
			Kuota:      kuota,
			Terisi:     terisi,
		})
	}

	var result []entity.KecamatanData
	for kec, jalanList := range mapData {
		result = append(result, entity.KecamatanData{
			Kecamatan: kec,
			Jalan:     jalanList,
		})
	}
	return result, nil
}

// CreateJalan menambahkan jalan baru
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
		return err
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

// UpdateJalan update nama & kapasitas
func (r *Repository) UpdateJalan(ctx context.Context, id, namaJalan string, kapasitas int) error {
	_, err := r.db.Exec(ctx, `
		UPDATE master_jalan
		SET nama_jalan = $1, kapasitas = $2, updated_at = now()
		WHERE id = $3 AND deleted_at IS NULL
	`, namaJalan, kapasitas, id)
	return err
}

// DeleteJalan soft delete
func (r *Repository) DeleteJalan(ctx context.Context, id string) error {
	_, err := r.db.Exec(ctx, `
		UPDATE master_jalan
		SET deleted_at = now()
		WHERE id = $1 AND deleted_at IS NULL
	`, id)
	return err
}

// GetInstansiByNama mencari instansi berdasarkan nama_unit
func (r *Repository) GetInstansiByNama(ctx context.Context, namaUnit string) (string, error) {
	var id string
	err := r.db.QueryRow(ctx, `
		SELECT id FROM master_instansi
		WHERE nama_unit = $1 AND deleted_at IS NULL
	`, namaUnit).Scan(&id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return "", nil
		}
		return "", err
	}
	return id, nil
}

// GetAllInstansi ambil semua instansi
func (r *Repository) GetAllInstansi(ctx context.Context) ([]entity.InstansiData, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, nama_unit FROM master_instansi WHERE deleted_at IS NULL ORDER BY nama_unit
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