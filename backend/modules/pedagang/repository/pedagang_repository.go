package repository

import (
	"context"
	"database/sql"
	"errors"

	"cfd-backend/modules/pedagang/entity"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type PedagangRepository struct {
	db *pgxpool.Pool
}

func NewPedagangRepository(db *pgxpool.Pool) *PedagangRepository {
	return &PedagangRepository{db: db}
}

// CreatePengajuanMandiri bikin baris pedagang_profiles baru. Dipakai untuk
// dua alur: self-service (pedagang daftar sendiri) DAN admin (Tambah Pedagang),
// karena keduanya insert ke kolom yang sama persis.
//
// Tidak ada lagi tahap verifikasi: pedagang langsung berstatus 'approved'
// begitu terdaftar, supaya menu pedagang (stage "verified") langsung muncul.
//
// mandiri = true  -> pedagang daftar sendiri: submitted_at diisi NOW(),
//                    jadi terhitung "Pedagang Baru".
// mandiri = false -> ditambahkan admin: submitted_at dibiarkan NULL,
//                    jadi terhitung "Pedagang Lama".
func (r *PedagangRepository) CreatePengajuanMandiri(
	ctx context.Context,
	userID, nik, namaLengkap, tanggalLahir, namaUsaha, jenisDagangan, jenisLapak string,
	mandiri bool,
) (string, error) {
	var id string
	err := r.db.QueryRow(ctx,
		`INSERT INTO pedagang_profiles 
		 (user_id, nik, nama_lengkap, tanggal_lahir, nama_usaha, jenis_dagangan, jenis_lapak, status_verifikasi, submitted_at)
		 VALUES ($1, $2, $3, $4, $5, $6::jenis_dagangan_enum, $7::jenis_lapak_enum, 'approved',
		         CASE WHEN $8::boolean THEN NOW() ELSE NULL END)
		 RETURNING id`,
		userID, nik, namaLengkap, tanggalLahir, namaUsaha, jenisDagangan, jenisLapak, mandiri,
	).Scan(&id)
	if err != nil {
		return "", err
	}
	return id, nil
}

// ErrProfilSudahDihapus: user ini pernah punya profil pedagang yang sudah
// dihapus admin, jadi tidak bisa mengisi data usaha lagi dengan akun ini.
var ErrProfilSudahDihapus = errors.New("profil pedagang untuk akun ini sudah dihapus admin")

// SimpanPengajuanMandiri -- dipakai alur self-service (pedagang daftar
// sendiri). Bedanya dengan CreatePengajuanMandiri: kalau user ini SUDAH
// punya profil, datanya DIPERBARUI, bukan ditolak.
//
// Kenapa: di halaman Daftar Lapak, data usaha disimpan lalu langsung
// klaim lapak. Kalau klaimnya gagal (lapak belum diacak / penuh), dulu
// pedagang kejebak -- kirim ulang form ditolak "kamu sudah pernah
// mengajukan usaha sebelumnya", padahal belum dapat nomor lapak. Sekarang
// kirim ulang aman: profilnya di-update, lalu klaim dicoba lagi.
//
// submitted_at sengaja gak diubah waktu update, supaya status Pedagang
// Lama/Baru-nya tetap. Profil yang sudah dihapus (deleted_at terisi)
// tidak ikut di-update -> ErrProfilSudahDihapus.
func (r *PedagangRepository) SimpanPengajuanMandiri(
	ctx context.Context,
	userID, nik, namaLengkap, tanggalLahir, namaUsaha, jenisDagangan, jenisLapak string,
) (string, error) {
	var id string
	err := r.db.QueryRow(ctx,
		`INSERT INTO pedagang_profiles
		 (user_id, nik, nama_lengkap, tanggal_lahir, nama_usaha, jenis_dagangan, jenis_lapak, status_verifikasi, submitted_at)
		 VALUES ($1, $2, $3, $4, $5, $6::jenis_dagangan_enum, $7::jenis_lapak_enum, 'approved', NOW())
		 ON CONFLICT (user_id) DO UPDATE SET
			nik            = EXCLUDED.nik,
			nama_lengkap   = EXCLUDED.nama_lengkap,
			tanggal_lahir  = EXCLUDED.tanggal_lahir,
			nama_usaha     = EXCLUDED.nama_usaha,
			jenis_dagangan = EXCLUDED.jenis_dagangan,
			jenis_lapak    = EXCLUDED.jenis_lapak,
			updated_at     = NOW()
		 WHERE pedagang_profiles.deleted_at IS NULL
		 RETURNING id`,
		userID, nik, namaLengkap, tanggalLahir, namaUsaha, jenisDagangan, jenisLapak,
	).Scan(&id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return "", ErrProfilSudahDihapus
		}
		return "", err
	}
	return id, nil
}

// GetStatusPendaftaran ngecek apakah pendaftaran usaha lagi dibuka petugas
// (is_open), dan kalau jam_buka_pendaftaran/jam_tutup_pendaftaran di-set,
// apakah sekarang masih dalam rentang itu. Kalau salah satu jamnya NULL,
// berarti gak ada batasan jam (cuma is_open yang dicek).
func (r *PedagangRepository) GetStatusPendaftaran(ctx context.Context) (isOpen bool, dalamJam bool, err error) {
	err = r.db.QueryRow(ctx, `
		SELECT is_open,
		       (jam_buka_pendaftaran IS NULL OR jam_tutup_pendaftaran IS NULL
		        OR CURRENT_TIME BETWEEN jam_buka_pendaftaran AND jam_tutup_pendaftaran) AS dalam_jam
		FROM pengaturan_pendaftaran
		LIMIT 1
	`).Scan(&isOpen, &dalamJam)
	if err != nil {
		return false, false, err
	}
	return isOpen, dalamJam, nil
}

// GetPengajuanByUserID dipakai buat nampilin status pengajuan
func (r *PedagangRepository) GetPengajuanByUserID(ctx context.Context, userID string) (*entity.PengajuanStatus, error) {
	var p entity.PengajuanStatus
	var namaLengkap, tanggalLahir, jenisLapak, perkiraanHarga, alamat sql.NullString

	err := r.db.QueryRow(ctx,
		`SELECT id, nik, nama_lengkap, tanggal_lahir::text, nama_usaha, jenis_dagangan,
		        jenis_lapak, perkiraan_harga, alamat, status_verifikasi, catatan
		 FROM pedagang_profiles
		 WHERE user_id = $1 AND deleted_at IS NULL`,
		userID,
	).Scan(
		&p.ID, &p.NIK, &namaLengkap, &tanggalLahir, &p.NamaUsaha, &p.JenisDagangan,
		&jenisLapak, &perkiraanHarga, &alamat, &p.StatusVerifikasi, &p.Catatan,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	p.NamaLengkap = &namaLengkap.String
	p.TanggalLahir = &tanggalLahir.String
	p.JenisLapak = &jenisLapak.String
	p.PerkiraanHarga = &perkiraanHarga.String
	p.Alamat = &alamat.String

	return &p, nil
}

// ListPedagang mengambil data pedagang beserta profilnya
func (r *PedagangRepository) ListPedagang(ctx context.Context) ([]entity.PedagangUserDTO, int, error) {
	rows, err := r.db.Query(ctx, `
		SELECT 
			u.id, u.name, u.email, u.phone, u.created_at, u.status,
			p.nik, p.nama_lengkap, p.tanggal_lahir::text, p.nama_usaha, p.jenis_dagangan,
			p.jenis_lapak, p.perkiraan_harga, p.alamat, p.status_verifikasi
		FROM users u
		JOIN user_roles ur ON ur.user_id = u.id AND ur.deleted_at IS NULL
		JOIN roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
		LEFT JOIN pedagang_profiles p ON p.user_id = u.id AND p.deleted_at IS NULL
		WHERE r.slug = 'pedagang'
		  AND u.deleted_at IS NULL
		ORDER BY u.created_at DESC
	`)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var users []entity.PedagangUserDTO
	for rows.Next() {
		var u entity.PedagangUserDTO
		var createdAt, status, nik, namaLengkap, tanggalLahir, namaUsaha, jenisDagangan, jenisLapak, perkiraanHarga, alamat, statusVerifikasi sql.NullString

		err := rows.Scan(
			&u.ID, &u.Name, &u.Email, &u.Phone,
			&createdAt, &status,
			&nik, &namaLengkap, &tanggalLahir, &namaUsaha, &jenisDagangan,
			&jenisLapak, &perkiraanHarga, &alamat, &statusVerifikasi,
		)
		if err != nil {
			return nil, 0, err
		}

		u.JoinedAt = createdAt.String
		u.Active = status.String == "active"
		u.Initial = string([]rune(u.Name)[0])
		u.NIK = &nik.String
		u.NamaLengkap = &namaLengkap.String
		u.TanggalLahir = &tanggalLahir.String
		u.NamaUsaha = &namaUsaha.String
		u.JenisDagangan = &jenisDagangan.String
		u.JenisLapak = &jenisLapak.String
		u.PerkiraanHarga = &perkiraanHarga.String
		u.Alamat = &alamat.String
		u.StatusVerifikasi = &statusVerifikasi.String

		users = append(users, u)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, err
	}

	return users, len(users), nil
}

// GetPedagangStats menghitung statistik pedagang
func (r *PedagangRepository) GetPedagangStats(ctx context.Context) (entity.PedagangStatsResponse, error) {
	var stats entity.PedagangStatsResponse

	err := r.db.QueryRow(ctx, `
		SELECT COUNT(*) 
		FROM users u
		JOIN user_roles ur ON ur.user_id = u.id AND ur.deleted_at IS NULL
		JOIN roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
		WHERE r.slug = 'pedagang' AND u.deleted_at IS NULL
	`).Scan(&stats.Total)
	if err != nil {
		return stats, err
	}

	err = r.db.QueryRow(ctx, `
		SELECT COUNT(*) 
		FROM users u
		JOIN user_roles ur ON ur.user_id = u.id AND ur.deleted_at IS NULL
		JOIN roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
		WHERE r.slug = 'pedagang' AND u.status = 'active' AND u.deleted_at IS NULL
	`).Scan(&stats.Active)
	if err != nil {
		return stats, err
	}

	err = r.db.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM pedagang_profiles p
		JOIN users u ON u.id = p.user_id AND u.deleted_at IS NULL
		JOIN user_roles ur ON ur.user_id = u.id AND ur.deleted_at IS NULL
		JOIN roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
		WHERE r.slug = 'pedagang' AND p.status_verifikasi = 'pending' AND p.deleted_at IS NULL
	`).Scan(&stats.Pending)
	if err != nil {
		return stats, err
	}

	err = r.db.QueryRow(ctx, `
		SELECT COUNT(*) 
		FROM users u
		JOIN user_roles ur ON ur.user_id = u.id AND ur.deleted_at IS NULL
		JOIN roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
		WHERE r.slug = 'pedagang' AND u.status = 'suspended' AND u.deleted_at IS NULL
	`).Scan(&stats.Suspended)
	if err != nil {
		return stats, err
	}

	return stats, nil
}

func (r *PedagangRepository) GetPedagangByID(ctx context.Context, id string) (*entity.PedagangUserDTO, error) {
	var u entity.PedagangUserDTO
	var createdAt, status, nik, namaLengkap, tanggalLahir, namaUsaha, jenisDagangan, jenisLapak, perkiraanHarga, alamat, lokasiLapak, statusVerifikasi sql.NullString
	var phone sql.NullString

	// Filter r.slug = 'pedagang' supaya endpoint ini gak bisa dipakai buat
	// ngintip data akun petugas/superadmin lewat id-nya.
	err := r.db.QueryRow(ctx, `
		SELECT
			u.id, u.name, u.email, u.phone, u.created_at::text, u.status::text,
			p.nik, p.nama_lengkap, p.tanggal_lahir::text, p.nama_usaha, p.jenis_dagangan::text,
			p.jenis_lapak::text, p.perkiraan_harga, p.alamat, p.lokasi_lapak, p.status_verifikasi::text
		FROM users u
		JOIN user_roles ur ON ur.user_id = u.id AND ur.deleted_at IS NULL
		JOIN roles r ON r.id = ur.role_id AND r.deleted_at IS NULL AND r.slug = 'pedagang'
		LEFT JOIN pedagang_profiles p ON p.user_id = u.id AND p.deleted_at IS NULL
		WHERE u.id = $1 AND u.deleted_at IS NULL
		LIMIT 1
	`, id,
	).Scan(
		&u.ID, &u.Name, &u.Email, &phone,
		&createdAt, &status,
		&nik, &namaLengkap, &tanggalLahir, &namaUsaha, &jenisDagangan,
		&jenisLapak, &perkiraanHarga, &alamat, &lokasiLapak, &statusVerifikasi,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	u.Phone = phone.String
	u.JoinedAt = createdAt.String
	u.Active = status.String == "active"
	if nama := []rune(u.Name); len(nama) > 0 {
		u.Initial = string(nama[0])
	}
	u.NIK = &nik.String
	u.NamaLengkap = &namaLengkap.String
	u.TanggalLahir = &tanggalLahir.String
	u.NamaUsaha = &namaUsaha.String
	u.JenisDagangan = &jenisDagangan.String
	u.JenisLapak = &jenisLapak.String
	u.PerkiraanHarga = &perkiraanHarga.String
	u.Alamat = &alamat.String
	u.LokasiLapak = &lokasiLapak.String
	u.StatusVerifikasi = &statusVerifikasi.String

	return &u, nil
}

// ErrPedagangTidakDitemukan dipakai UpdatePedagang & DeletePedagang kalau
// id user-nya gak ada (atau sudah dihapus).
var ErrPedagangTidakDitemukan = errors.New("pedagang tidak ditemukan")

// UpdatePedagang meng-update data akun (users) sekaligus profil dagangan
// (pedagang_profiles) dalam satu transaksi. NIK, email, dan tanggal lahir
// sengaja gak ikut diupdate di sini -- itu data identitas yang dikunci
// (disabled) di form edit, konsisten sama halaman Edit Petugas/Superadmin.
//
// jenisDagangan / jenisLapak / lokasiLapak boleh kosong -> disimpan NULL
// (NULLIF), supaya pedagang lama hasil import yang kolomnya belum diisi
// gak bikin error "invalid input value for enum".
func (r *PedagangRepository) UpdatePedagang(ctx context.Context, id, name, phone, namaUsaha, jenisDagangan, jenisLapak, lokasiLapak string) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	tag, err := tx.Exec(ctx,
		`UPDATE users SET name = $1, phone = $2, updated_at = NOW() WHERE id = $3 AND deleted_at IS NULL`,
		name, phone, id,
	)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrPedagangTidakDitemukan
	}

	_, err = tx.Exec(ctx,
		`UPDATE pedagang_profiles
		 SET nama_lengkap   = $1,
		     nama_usaha     = $2,
		     jenis_dagangan = NULLIF($3, '')::jenis_dagangan_enum,
		     jenis_lapak    = NULLIF($4, '')::jenis_lapak_enum,
		     lokasi_lapak   = NULLIF($5, ''),
		     phone          = $6,
		     updated_at     = NOW()
		 WHERE user_id = $7 AND deleted_at IS NULL`,
		name, namaUsaha, jenisDagangan, jenisLapak, lokasiLapak, phone, id,
	)
	if err != nil {
		return err
	}

	return tx.Commit(ctx)
}

// DeletePedagang soft-delete akun pedagang BESERTA profilnya dalam satu
// transaksi.
//
// Profil ikut di-soft-delete karena unique index NIK
// (idx_pedagang_nik_active) cuma berlaku untuk baris dengan
// deleted_at IS NULL. Dulu cuma users yang dihapus, jadi NIK pedagang yang
// sudah dihapus tetap "terkunci" dan gak bisa didaftarkan ulang.
//
// Klaim lapak AKTIF di sesi hari ini / yang akan datang yang belum
// check-in ikut dibatalkan (status 'batal'), sama seperti yang dilakukan
// BatalkanKlaimBelumCheckIn waktu sesi ditutup. Riwayat klaim & kehadiran
// di sesi yang sudah lewat dibiarkan apa adanya buat laporan.
func (r *PedagangRepository) DeletePedagang(ctx context.Context, id string) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx, `
		UPDATE lapak_klaim lk
		SET status = 'batal'
		FROM pedagang_profiles p, cfd_sessions cs
		WHERE p.user_id = $1
		  AND lk.pedagang_id = p.id
		  AND cs.id = lk.session_id
		  AND lk.status = 'aktif'
		  AND cs.tanggal >= CURRENT_DATE
		  AND NOT EXISTS (
			SELECT 1 FROM kehadiran_pedagang kh
			WHERE kh.pedagang_id = lk.pedagang_id
			  AND kh.session_id = lk.session_id
			  AND kh.deleted_at IS NULL
		  )
	`, id); err != nil {
		return err
	}

	if _, err := tx.Exec(ctx,
		`UPDATE pedagang_profiles SET deleted_at = NOW(), updated_at = NOW() WHERE user_id = $1 AND deleted_at IS NULL`,
		id,
	); err != nil {
		return err
	}

	tag, err := tx.Exec(ctx,
		`UPDATE users SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL`,
		id,
	)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrPedagangTidakDitemukan
	}

	return tx.Commit(ctx)
}