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

// GetSesiKehadiranBelumCheckout balikin session_id dari kehadiran pedagang
// yang udah check-in tapi BELUM checkout, di sesi mana pun (bukan cuma
// sesi hari ini). Kalau ada lebih dari satu, yang paling lama duluan --
// itu yang harus diberesin dulu. String kosong = gak ada yang menggantung.
//
// Ini pasangan dari scan-qr AdaKehadiranBelumCheckout: kalau check-in
// nolak pedagang karena masih ada kehadiran yang belum checkout, halaman
// checkout HARUS bisa nemuin kehadiran yang sama -- sebelumnya checkout
// cuma baca sesi terbaru hari ini, jadi pedagang kekunci (check-in
// ditolak, tombol checkout juga gak muncul).
func (r *CheckoutRepository) GetSesiKehadiranBelumCheckout(ctx context.Context, pedagangID string) (string, error) {
	var sessionID string
	err := r.db.QueryRow(ctx, `
		SELECT session_id FROM kehadiran_pedagang
		WHERE pedagang_id = $1 AND check_out_at IS NULL AND deleted_at IS NULL
		ORDER BY check_in_at ASC
		LIMIT 1
		`, pedagangID,
	).Scan(&sessionID)
	if err != nil {
		if err == pgx.ErrNoRows {
			return "", nil
		}
		return "", err
	}
	return sessionID, nil
}

// PastikanSesiSelesai jadi penjaga terakhir SubmitCheckout: checkout cuma
// boleh setelah sesi MILIK KEHADIRAN ITU berakhir -- lewat jam_selesai di
// TANGGAL sesinya, atau udah di-"Akhiri Sesi Lebih Awal" (is_active false).
func (r *CheckoutRepository) PastikanSesiSelesai(ctx context.Context, sessionID string) error {
	var tanggal, jamSelesai string
	var isActive bool
	err := r.db.QueryRow(ctx,
		`SELECT tanggal::text, jam_selesai::text, is_active FROM cfd_sessions WHERE id = $1`,
		sessionID,
	).Scan(&tanggal, &jamSelesai, &isActive)
	if err != nil {
		if err == pgx.ErrNoRows {
			return ErrTidakAdaSesiAktif
		}
		return err
	}

	selesai, ok := waktuSelesaiSesi(tanggal, jamSelesai, time.Now().Location())
	if isActive && ok && time.Now().Before(selesai) {
		return ErrSesiBelumSelesai
	}
	return nil
}

// waktuSelesaiSesi gabungin cfd_sessions.tanggal + jam_selesai jadi satu
// timestamp. Pakai TANGGAL SESI, bukan tanggal hari ini -- kalau pakai hari
// ini, kehadiran dari minggu lalu bisa dianggap "sesi belum selesai" cuma
// karena jam sekarang belum lewat jam_selesai.
func waktuSelesaiSesi(tanggal, jamSelesai string, loc *time.Location) (time.Time, bool) {
	t, err := time.ParseInLocation("2006-01-02 15:04:05", tanggal+" "+jamSelesai, loc)
	if err != nil {
		return time.Time{}, false
	}
	return t, true
}

// GetTodaySessionID ambil ID sesi CFD hari ini TANPA mensyaratkan sesinya
// udah selesai. Dipakai buat GetDataCheckout (nampilin halaman cek-out),
// yang mestinya boleh dibuka kapan aja setelah check-in -- termasuk pas
// sesi masih berlangsung, biar pedagang bisa liat hitung mundur. Dipakai
// kalau pedagang gak punya kehadiran yang menggantung (lihat
// GetSesiKehadiranBelumCheckout).
func (r *CheckoutRepository) GetTodaySessionID(ctx context.Context) (string, error) {
	var id string
	err := r.db.QueryRow(ctx,
		`SELECT id FROM cfd_sessions
		 WHERE tanggal = CURRENT_DATE AND deleted_at IS NULL
		 ORDER BY created_at DESC
		 LIMIT 1`,
	).Scan(&id)
	if err != nil {
		if err == pgx.ErrNoRows {
			return "", ErrTidakAdaSesiAktif
		}
		return "", err
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
	var tanggalSesiStr *string
	var jamSelesaiStr *string
	var sesiIsActive *bool

	err := r.db.QueryRow(ctx, `
		SELECT
			COALESCE(mi.nama_instansi, ''),
			COALESCE(j.nama_jalan, ''),
			COALESCE((
				SELECT e->>'namaRuas' FROM jsonb_array_elements(j.ruas) e
				WHERE e->>'id' = lk.ruas_id LIMIT 1
			), ''),
			COALESCE(lk.nomor_lapak, ''),
			pp.nik,
			COALESCE(pp.nama_lengkap, ''),
			COALESCE(pp.tanggal_lahir::text, ''),
			COALESCE(pp.nama_usaha, ''),
			COALESCE(pp.jenis_dagangan::text, ''),
			COALESCE(pp.jenis_lapak::text, ''),
			kp.check_in_at,
			kp.check_out_at,
			kp.omset,
			cs.tanggal::text,
			cs.jam_selesai::text,
			cs.is_active
		FROM pedagang_profiles pp
		LEFT JOIN lapak_klaim lk
		       ON lk.pedagang_id = pp.id AND lk.session_id = $2 AND lk.status = 'aktif'
		LEFT JOIN master_jalan j
		       ON j.id = lk.jalan_id
		LEFT JOIN jalan_instansi ji
		       ON ji.jalan_id = j.id
		LEFT JOIN master_instansi mi
		       ON mi.id = ji.instansi_id AND mi.nama_unit = 'Kecamatan'
		LEFT JOIN kehadiran_pedagang kp
		       ON kp.pedagang_id = pp.id AND kp.session_id = $2 AND kp.deleted_at IS NULL
		LEFT JOIN cfd_sessions cs
		       ON cs.id = $2
		WHERE pp.id = $1
		`, pedagangID, sessionID,
	).Scan(
		&d.Kecamatan, &d.NamaJalan, &d.NamaRuas, &d.NomorStan,
		&d.NIK, &d.NamaLengkap, &d.TanggalLahir,
		&d.NamaUsaha, &d.KategoriUsaha, &d.JenisLapak,
		&checkInAt, &checkOutAt, &omset,
		&tanggalSesiStr, &jamSelesaiStr, &sesiIsActive,
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

	// Gabungin TANGGAL SESI + jam_selesai jadi 1 timestamp lengkap, biar
	// frontend gak perlu nebak-nebak tanggalnya sendiri. Sesinya bisa aja
	// bukan hari ini (kehadiran lama yang belum checkout). SesiSudahSelesai
	// jadi acuan utama buat nge-enable tombol cek-out di frontend.
	d.SesiSudahSelesai = true
	if tanggalSesiStr != nil && jamSelesaiStr != nil {
		if selesai, ok := waktuSelesaiSesi(*tanggalSesiStr, *jamSelesaiStr, time.Now().Location()); ok {
			d.JamSelesaiSesi = &selesai
			isActive := sesiIsActive != nil && *sesiIsActive
			d.SesiSudahSelesai = !isActive || !time.Now().Before(selesai)
		}
	}
	// Kalau sesi/jam_selesai gak ketemu -- anggap sudah selesai daripada
	// nge-block cek-out tanpa alasan jelas ke user.

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