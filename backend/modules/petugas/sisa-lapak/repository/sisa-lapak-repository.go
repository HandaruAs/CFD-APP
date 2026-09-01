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

// terjemahkanError mengubah error database mentah (khususnya pelanggaran
// UNIQUE constraint) menjadi pesan yang mudah dipahami pengguna, alih-alih
// menampilkan pesan SQLSTATE mentah ke frontend.
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

// GetSisaLapak ambil data kuota + terisi + id & kode_jalan
func (r *Repository) GetSisaLapak(ctx context.Context) ([]entity.KecamatanData, error) {
	// Cari sesi aktif hari ini. Kalau tidak ada, sessionID tetap nil (NULL)
	// -- JANGAN pakai string kosong "" karena kolom session_id bertipe UUID,
	// dan "" bukan UUID yang valid (bikin error "invalid input syntax for type uuid").
	var sessionID *string
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
			COALESCE(mi.nama_instansi, 'Tanpa Kecamatan') AS kecamatan,
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
		ORDER BY mi.nama_instansi, mj.nama_jalan
	`
	rows, err := r.db.Query(ctx, query, sessionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	mapData := make(map[string][]entity.JalanData)
	var urutanKecamatan []string // simpan urutan kemunculan sesuai ORDER BY di SQL,
	// karena iterasi Go map tidak dijamin konsisten urutannya.
	for rows.Next() {
		var kec, id, kodeJalan, namaJalan string
		var kuota, terisi int
		if err := rows.Scan(&kec, &id, &kodeJalan, &namaJalan, &kuota, &terisi); err != nil {
			return nil, err
		}
		if _, sudahAda := mapData[kec]; !sudahAda {
			urutanKecamatan = append(urutanKecamatan, kec)
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
	for _, kec := range urutanKecamatan {
		result = append(result, entity.KecamatanData{
			Kecamatan: kec,
			Jalan:     mapData[kec],
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

// UpdateJalan update kode, nama & kapasitas
func (r *Repository) UpdateJalan(ctx context.Context, id, kodeJalan, namaJalan string, kapasitas int) error {
	_, err := r.db.Exec(ctx, `
		UPDATE master_jalan
		SET kode_jalan = $1, nama_jalan = $2, kapasitas = $3, updated_at = now()
		WHERE id = $4 AND deleted_at IS NULL
	`, kodeJalan, namaJalan, kapasitas, id)
	return terjemahkanError(err)
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

// InstansiExists cek apakah instansi dengan id tersebut ada & belum dihapus
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

// GetAllInstansi ambil semua instansi
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