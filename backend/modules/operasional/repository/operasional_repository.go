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
//
// Status ikut di-reset jadi 'berlangsung' setiap kali baris sudah ada --
// KECUALI kalau statusnya lagi 'diperpanjang', itu dibiarin biar histori
// "sesi ini pernah diperpanjang" tetap kecatat di Riwayat Operasional.
// Efeknya: kalau sesi hari ini sudah 'diakhiri_awal'/'selesai_normal',
// petugas simpan jam baru lewat "Simpan Perubahan" = sesinya "dibuka
// ulang" jadi berlangsung lagi (dianggap koreksi, bukan sesi baru).
func (r *OperasionalRepository) UpsertSesiHariIni(ctx context.Context, jamMulai, jamSelesaiRencana string, createdBy *string) (*entity.Sesi, error) {
	row := r.db.QueryRow(ctx, `
		INSERT INTO cfd_sessions (tanggal, jam_mulai, jam_selesai_rencana, status, created_by)
		VALUES (CURRENT_DATE, $1, $2, 'berlangsung', $3)
		ON CONFLICT (tanggal) WHERE deleted_at IS NULL
		DO UPDATE SET
			jam_mulai = EXCLUDED.jam_mulai,
			jam_selesai_rencana = EXCLUDED.jam_selesai_rencana,
			status = CASE
				WHEN cfd_sessions.status = 'diperpanjang' THEN cfd_sessions.status
				ELSE 'berlangsung'
			END,
			jam_selesai_aktual = NULL,
			updated_at = now()
		RETURNING `+sesiColumns,
		jamMulai, jamSelesaiRencana, createdBy,
	)

	return scanSesi(row)
}

// AkhiriSesiLebihAwal dipakai tombol "Akhiri Sesi Lebih Awal". Boleh
// dipanggil selama sesinya masih aktif (jam_selesai_aktual IS NULL),
// nggak peduli status-nya 'berlangsung' atau 'diperpanjang'.
func (r *OperasionalRepository) AkhiriSesiLebihAwal(ctx context.Context, id string) (*entity.Sesi, error) {
	row := r.db.QueryRow(ctx, `
		UPDATE cfd_sessions
		SET status = 'diakhiri_awal', jam_selesai_aktual = CURRENT_TIME, updated_at = now()
		WHERE id = $1 AND deleted_at IS NULL AND jam_selesai_aktual IS NULL
		RETURNING `+sesiColumns,
		id,
	)

	s, err := scanSesi(row)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil // id salah, atau sesinya udah nggak aktif
		}
		return nil, err
	}
	return s, nil
}

// --- Dipakai background job (scheduler) buat auto mulai/selesaiin sesi ---

// GetJadwalHariIni ambil jadwal mingguan yang AKTIF buat hari tertentu
// (dari entity.HariDariWeekday(time.Now().Weekday())). Balikin (nil, nil)
// kalau nggak ada jadwal CFD buat hari itu (atau jadwalnya lagi
// dinonaktifkan) -- itu bukan error, artinya memang bukan hari CFD.
func (r *OperasionalRepository) GetJadwalHariIni(ctx context.Context, hari entity.Hari) (*entity.JadwalMingguan, error) {
	var j entity.JadwalMingguan
	err := r.db.QueryRow(ctx, `
		SELECT id, hari, jam_mulai::text, jam_selesai_rencana::text, is_active, updated_by, created_at, updated_at
		FROM jadwal_mingguan
		WHERE hari = $1 AND is_active = true
	`, hari).Scan(&j.ID, &j.Hari, &j.JamMulai, &j.JamSelesaiRencana, &j.IsActive, &j.UpdatedBy, &j.CreatedAt, &j.UpdatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &j, nil
}

// AutoSelesaikanSesi dipanggil scheduler buat nutup sesi begitu waktu
// server udah lewat jam_selesai_rencana-nya. Status TETAP 'diperpanjang'
// kalau memang lagi diperpanjang (biar riwayatnya jujur "pernah
// diperpanjang"), selain itu jadi 'selesai_normal'.
func (r *OperasionalRepository) AutoSelesaikanSesi(ctx context.Context, id, jamSelesaiRencana string) (*entity.Sesi, error) {
	row := r.db.QueryRow(ctx, `
		UPDATE cfd_sessions
		SET
			status = CASE WHEN status = 'diperpanjang' THEN status ELSE 'selesai_normal' END,
			jam_selesai_aktual = $1,
			updated_at = now()
		WHERE id = $2 AND deleted_at IS NULL AND jam_selesai_aktual IS NULL
		RETURNING `+sesiColumns,
		jamSelesaiRencana, id,
	)

	s, err := scanSesi(row)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return s, nil
}

// UpdateJadwalMingguan upsert (by hari) template jadwal mingguan.
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

// ListJadwalMingguan ambil semua baris jadwal mingguan (buat ditampilin
// di halaman pengaturan, kalau nanti dibikin).
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

// PerpanjangSesi ganti jam_selesai_rencana ke jam yang lebih lambat dan
// set status jadi 'diperpanjang'. jam_selesai_aktual IS NULL dipakai
// sebagai penanda "sesi ini masih aktif" (bukan status-nya) -- jadi boleh
// dipanggil berkali-kali dalam sehari selama sesinya belum ditutup.
func (r *OperasionalRepository) PerpanjangSesi(ctx context.Context, id, jamSelesaiBaru string) (*entity.Sesi, error) {
	row := r.db.QueryRow(ctx, `
		UPDATE cfd_sessions
		SET jam_selesai_rencana = $1, status = 'diperpanjang', updated_at = now()
		WHERE id = $2 AND deleted_at IS NULL AND jam_selesai_aktual IS NULL
		RETURNING `+sesiColumns,
		jamSelesaiBaru, id,
	)

	s, err := scanSesi(row)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil // id salah, atau sesinya udah berakhir
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
