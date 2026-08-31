package repository

import (
	"context"
	"errors"
	"time"

	"cfd-backend/modules/pedagang/checkout/entity"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrPedagangTidakDitemukan = errors.New("profil pedagang tidak ditemukan")
	ErrTidakAdaSesiAktif      = errors.New("tidak ada sesi CFD yang aktif sekarang")
	ErrSesiBelumSelesai      = errors.New("sesi CFD masih berlangsung, check-out baru bisa dilakukan setelah sesi berakhir")
	ErrBelumCheckIn           = errors.New("kamu belum check-in, minta petugas untuk scan QR dulu")
	ErrSudahCheckOut          = errors.New("kamu sudah cek-out di sesi ini")
)

type CheckoutRepository struct {
	db *pgxpool.Pool
}

func NewCheckoutRepository(db *pgxpool.Pool) *CheckoutRepository {
	return &CheckoutRepository{db: db}
}

// GetPedagangProfileIDByUserID nerjemahin user_id (dari token JWT) ke
// pedagang_profiles.id. Sengaja duplikat query kecil ini (bukan di-share
// lintas modul) -- ngikutin pola yang udah dipakai di modules/pedagang/lapak
// dan modules/petugas/scan-qr.
func (r *CheckoutRepository) GetPedagangProfileIDByUserID(ctx context.Context, userID string) (string, error) {
	var id string
	err := r.db.QueryRow(ctx,
		`SELECT id FROM pedagang_profiles WHERE user_id = $1 AND deleted_at IS NULL`,
		userID,
	).Scan(&id)
	if err != nil {
		if err == pgx.ErrNoRows {
			return "", ErrPedagangTidakDitemukan
		}
		return "", err
	}
	return id, nil
}

// GetActiveSessionID ambil ID sesi CFD hari ini buat keperluan checkout.
// Beda dari modules/pedagang/lapak (yang ngeblok check-in SEBELUM sesi
// mulai/di luar jam check-in), checkout justru harus diblok SELAMA sesi
// masih berlangsung -- baru boleh setelah sesi itu berakhir (baik karena
// waktu emang udah lewat jam_selesai, ATAUPUN petugas udah manual
// "Akhiri Sesi Lebih Awal", yang keduanya bikin is_active jadi false).
func (r *CheckoutRepository) GetActiveSessionID(ctx context.Context) (string, error) {
	var id, jamSelesai string
	var isActive bool
	err := r.db.QueryRow(ctx,
		`SELECT id, jam_selesai::text, is_active FROM cfd_sessions
		 WHERE tanggal = CURRENT_DATE AND deleted_at IS NULL
		 ORDER BY created_at DESC
		 LIMIT 1`,
	).Scan(&id, &jamSelesai, &isActive)
	if err != nil {
		if err == pgx.ErrNoRows {
			return "", ErrTidakAdaSesiAktif
		}
		return "", err
	}

	now := time.Now().Format("15:04:05")
	sesiMasihBerlangsung := isActive && now < jamSelesai
	if sesiMasihBerlangsung {
		return "", ErrSesiBelumSelesai
	}

	return id, nil
}

// GetDataCheckout gabungin data profil pedagang + lokasi lapak yang udah
// diklaim (lapak_klaim -> master_jalan -> jalan_instansi -> master_instansi)
// + status kehadiran (kehadiran_pedagang) untuk 1 sesi aktif.
func (r *CheckoutRepository) GetDataCheckout(ctx context.Context, pedagangID, sessionID string) (*entity.DataCheckoutResponse, error) {
	var d entity.DataCheckoutResponse
	var omset *int64
	var checkInAt *time.Time
	var checkOutAt *time.Time

	err := r.db.QueryRow(ctx, `
		SELECT
			COALESCE(mi.nama_instansi, ''),
			COALESCE(j.nama_jalan, ''),
			COALESCE(lk.nomor_lapak, ''),
			pp.nik,
			COALESCE(pp.nama_lengkap, ''),
			COALESCE(pp.tanggal_lahir::text, ''),
			COALESCE(pp.nama_usaha, ''),
			COALESCE(pp.jenis_dagangan::text, ''),
			COALESCE(pp.jenis_lapak::text, ''),
			kp.check_in_at,
			kp.check_out_at,
			kp.omset
		FROM pedagang_profiles pp
		LEFT JOIN lapak_klaim lk
		       ON lk.pedagang_id = pp.id AND lk.session_id = $2
		LEFT JOIN master_jalan j
		       ON j.id = lk.jalan_id
		LEFT JOIN jalan_instansi ji
		       ON ji.jalan_id = j.id
		LEFT JOIN master_instansi mi
		       ON mi.id = ji.instansi_id AND mi.nama_unit = 'Kecamatan'
		LEFT JOIN kehadiran_pedagang kp
		       ON kp.pedagang_id = pp.id AND kp.session_id = $2 AND kp.deleted_at IS NULL
		WHERE pp.id = $1
		`, pedagangID, sessionID,
	).Scan(
		&d.Kecamatan, &d.NamaJalan, &d.NomorStan,
		&d.NIK, &d.NamaLengkap, &d.TanggalLahir,
		&d.NamaUsaha, &d.KategoriUsaha, &d.JenisLapak,
		&checkInAt, &checkOutAt, &omset,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, ErrPedagangTidakDitemukan
		}
		return nil, err
	}

	d.SudahCheckIn = checkInAt != nil
	d.SudahCheckOut = checkOutAt != nil
	d.Omset = omset
	return &d, nil
}

// SubmitCheckout isi omset + tandai check_out_at pada baris kehadiran_pedagang
// yang udah ada (baris ini dibikin petugas pas scan QR check-in -- lihat
// modules/petugas/scan-qr). Query ini gak bisa nembus kalau pedagang belum
// pernah check-in (baris belum ada) atau udah pernah checkout (check_out_at
// udah keisi) -- RETURNING bakal kosong di kedua kasus itu.
func (r *CheckoutRepository) SubmitCheckout(ctx context.Context, pedagangID, sessionID string, omset int64) (time.Time, error) {
	var checkOutAt time.Time
	err := r.db.QueryRow(ctx, `
		UPDATE kehadiran_pedagang
		SET omset = $1, check_out_at = now(), updated_at = now()
		WHERE pedagang_id = $2 AND session_id = $3
		  AND deleted_at IS NULL
		  AND check_out_at IS NULL
		RETURNING check_out_at
		`, omset, pedagangID, sessionID,
	).Scan(&checkOutAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			// Bedain 2 kemungkinan penyebab biar pesan errornya presisi.
			var sudahCheckOut bool
			checkErr := r.db.QueryRow(ctx, `
				SELECT check_out_at IS NOT NULL
				FROM kehadiran_pedagang
				WHERE pedagang_id = $1 AND session_id = $2 AND deleted_at IS NULL
				`, pedagangID, sessionID,
			).Scan(&sudahCheckOut)

			if checkErr == nil && sudahCheckOut {
				return time.Time{}, ErrSudahCheckOut
			}
			return time.Time{}, ErrBelumCheckIn
		}
		return time.Time{}, err
	}
	return checkOutAt, nil
}