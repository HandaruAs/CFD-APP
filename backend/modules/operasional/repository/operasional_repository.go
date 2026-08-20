package repository

import (
	"context"

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

// kolom jam_mulai / jam_selesai_rencana / jam_selesai_aktual di database
// bertipe TIME dan tanggal bertipe DATE -- di-cast ::text di query biar
// bisa langsung di-Scan ke field string di entity.Sesi (sesuai komentar
// yang kamu tulis sendiri di sesi.go: "format 2006-01-02" / "15:04:05").
const sesiColumns = `
	id, tanggal::text, jam_mulai::text, jam_selesai_rencana::text,
	jam_selesai_aktual::text, status, created_by, created_at, updated_at
`

func scanSesi(row pgx.Row) (*entity.Sesi, error) {
	var s entity.Sesi
	err := row.Scan(
		&s.ID, &s.Tanggal, &s.JamMulai, &s.JamSelesaiRencana,
		&s.JamSelesaiAktual, &s.Status, &s.CreatedBy, &s.CreatedAt, &s.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &s, nil
}

// GetSesiHariIni ambil baris cfd_sessions buat tanggal hari ini (server).
// Balikin (nil, nil) kalau memang belum ada sesi yang diatur hari ini --
// itu BUKAN error, cuma artinya petugas belum pernah "Simpan Perubahan".
func (r *OperasionalRepository) GetSesiHariIni(ctx context.Context) (*entity.Sesi, error) {
	row := r.db.QueryRow(ctx, `
		SELECT `+sesiColumns+`
		FROM cfd_sessions
		WHERE tanggal = CURRENT_DATE AND deleted_at IS NULL
	`)

	s, err := scanSesi(row)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return s, nil
}

// UpsertSesiHariIni bikin baris sesi hari ini kalau belum ada, atau update
// jam_mulai/jam_selesai_rencana-nya kalau sudah ada (dipakai tombol
// "Simpan Perubahan"). Manfaatin unique index partial
// idx_cfd_sessions_tanggal_active dari migration 019 sebagai target
// ON CONFLICT.
func (r *OperasionalRepository) UpsertSesiHariIni(ctx context.Context, jamMulai, jamSelesaiRencana string, createdBy *string) (*entity.Sesi, error) {
	row := r.db.QueryRow(ctx, `
		INSERT INTO cfd_sessions (tanggal, jam_mulai, jam_selesai_rencana, status, created_by)
		VALUES (CURRENT_DATE, $1, $2, 'berlangsung', $3)
		ON CONFLICT (tanggal) WHERE deleted_at IS NULL
		DO UPDATE SET
			jam_mulai = EXCLUDED.jam_mulai,
			jam_selesai_rencana = EXCLUDED.jam_selesai_rencana,
			updated_at = now()
		RETURNING `+sesiColumns,
		jamMulai, jamSelesaiRencana, createdBy,
	)

	return scanSesi(row)
}

// AkhiriSesiLebihAwal dipakai tombol "Akhiri Sesi Lebih Awal". Cuma boleh
// nembak sesi yang statusnya masih 'berlangsung' -- makanya ada
// WHERE status = 'berlangsung' juga, biar nggak nimpa sesi yang udah
// selesai/diakhiri sebelumnya.
func (r *OperasionalRepository) AkhiriSesiLebihAwal(ctx context.Context, id string) (*entity.Sesi, error) {
	row := r.db.QueryRow(ctx, `
		UPDATE cfd_sessions
		SET status = 'diakhiri_awal', jam_selesai_aktual = CURRENT_TIME, updated_at = now()
		WHERE id = $1 AND deleted_at IS NULL AND status = 'berlangsung'
		RETURNING `+sesiColumns,
		id,
	)

	s, err := scanSesi(row)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil // id salah, atau sesinya udah nggak berlangsung
		}
		return nil, err
	}
	return s, nil
}

// PerpanjangSesi ganti jam_selesai_rencana ke jam yang lebih lambat dan
// set status jadi 'diperpanjang'. Cuma boleh dipakai selama sesi masih
// aktif ('berlangsung' ATAU udah pernah 'diperpanjang' sebelumnya --
// petugas boleh perpanjang lebih dari sekali dalam sehari).
func (r *OperasionalRepository) PerpanjangSesi(ctx context.Context, id, jamSelesaiBaru string) (*entity.Sesi, error) {
	row := r.db.QueryRow(ctx, `
		UPDATE cfd_sessions
		SET jam_selesai_rencana = $1, status = 'diperpanjang', updated_at = now()
		WHERE id = $2 AND deleted_at IS NULL AND status IN ('berlangsung', 'diperpanjang')
		RETURNING `+sesiColumns,
		jamSelesaiBaru, id,
	)

	s, err := scanSesi(row)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil // id salah, atau sesinya udah selesai/diakhiri
		}
		return nil, err
	}
	return s, nil
}

// ListRiwayat ambil sesi-sesi yang SUDAH selesai (bukan yang masih
// 'berlangsung' hari ini), buat tabel "Riwayat Operasional". Diurutin
// dari yang paling baru.
func (r *OperasionalRepository) ListRiwayat(ctx context.Context, limit int) ([]entity.Sesi, error) {
	rows, err := r.db.Query(ctx, `
		SELECT `+sesiColumns+`
		FROM cfd_sessions
		WHERE deleted_at IS NULL AND status != 'berlangsung'
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

// GetPengaturanPendaftaran ambil baris settings (cuma ada 1 baris di tabel).
func (r *OperasionalRepository) GetPengaturanPendaftaran(ctx context.Context) (*entity.PengaturanPendaftaran, error) {
	var p entity.PengaturanPendaftaran
	err := r.db.QueryRow(ctx, `
		SELECT id, is_open, link_pendaftaran, updated_by, updated_at
		FROM pengaturan_pendaftaran
		LIMIT 1
	`).Scan(&p.ID, &p.IsOpen, &p.LinkPendaftaran, &p.UpdatedBy, &p.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &p, nil
}

// UpdatePengaturanPendaftaran toggle buka/tutup. Nggak perlu WHERE id=...
// soalnya tabel ini emang didesain cuma 1 baris (lihat migration 019).
func (r *OperasionalRepository) UpdatePengaturanPendaftaran(ctx context.Context, isOpen bool, updatedBy *string) error {
	_, err := r.db.Exec(ctx, `
		UPDATE pengaturan_pendaftaran
		SET is_open = $1, updated_by = $2, updated_at = now()
	`, isOpen, updatedBy)
	return err
}
