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

// GetSesiHariIni ambil sesi yang aktif hari ini (is_active = true)
func (r *OperasionalRepository) GetSesiHariIni(ctx context.Context) (*entity.Sesi, error) {
	row := r.db.QueryRow(ctx, `
		SELECT `+sesiColumns+`
		FROM cfd_sessions
		WHERE tanggal = CURRENT_DATE AND is_active = true AND deleted_at IS NULL
	`)
	return scanSesi(row)
}

// UpsertSesiHariIni: buat sesi baru (insert) jika belum ada, tolak jika sudah ada
func (r *OperasionalRepository) UpsertSesiHariIni(ctx context.Context, jamMulai, jamSelesai string, createdBy *string) (*entity.Sesi, error) {
	existing, err := r.GetSesiHariIni(ctx)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return nil, errors.New("sesi hari ini sudah diatur, tidak bisa diubah")
	}

	// Generate nama sesi otomatis
	namaSesi := "CFD " + time.Now().Format("02 January 2006")

	row := r.db.QueryRow(ctx, `
		INSERT INTO cfd_sessions (
			nama_sesi, tanggal, jam_mulai, jam_selesai, status, created_by, is_active
		) VALUES ($1, CURRENT_DATE, $2, $3, 'aktif', $4, true)
		RETURNING `+sesiColumns,
		namaSesi, jamMulai, jamSelesai, createdBy,
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
		SELECT id, is_open, link_pendaftaran, jam_buka_pendaftaran::text, jam_tutup_pendaftaran::text, updated_by, updated_at
		FROM pengaturan_pendaftaran
		LIMIT 1
	`).Scan(&p.ID, &p.IsOpen, &p.LinkPendaftaran, &p.JamBuka, &p.JamTutup, &p.UpdatedBy, &p.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *OperasionalRepository) UpdatePengaturanPendaftaran(ctx context.Context, isOpen bool, jamBuka, jamTutup *string, link *string, updatedBy *string) error {
	_, err := r.db.Exec(ctx, `
		UPDATE pengaturan_pendaftaran
		SET is_open = $1,
			jam_buka_pendaftaran = $2,
			jam_tutup_pendaftaran = $3,
			link_pendaftaran = $4,
			updated_by = $5,
			updated_at = now()
	`, isOpen, jamBuka, jamTutup, link, updatedBy)
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