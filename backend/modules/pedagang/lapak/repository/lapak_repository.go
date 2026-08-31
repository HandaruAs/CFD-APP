package repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	"cfd-backend/modules/pedagang/lapak/entity"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrTidakAdaSesiAktif      = errors.New("tidak ada sesi CFD yang aktif sekarang")
	ErrCheckInDitutup         = errors.New("check-in pedagang sedang ditutup oleh petugas")
	ErrDiluarJamCheckIn       = errors.New("saat ini di luar jam check-in yang ditentukan petugas")
	ErrLapakPenuh             = errors.New("lapak di jalan ini sudah penuh")
	ErrSudahKlaim             = errors.New("kamu sudah klaim lapak di sesi ini")
	ErrPedagangTidakDitemukan = errors.New("profil pedagang tidak ditemukan")
)

type LapakRepository struct {
	db *pgxpool.Pool
}

func NewLapakRepository(db *pgxpool.Pool) *LapakRepository {
	return &LapakRepository{db: db}
}

// GetActiveSessionID ambil ID sesi CFD hari ini (dibutuhin buat foreign key
// di lapak_klaim/jalan_kapasitas_sesi -- klaim harus nempel ke sesi yang
// mana). Sesi HARUS ada dulu (petugas udah bikin jadwal), tapi kelayakan
// check-in-nya (boleh klaim nomor stand sekarang atau belum) ditentuin oleh
// Pengaturan Check-in Pedagang (pengaturan_pendaftaran.is_open +
// jam_buka_pendaftaran/jam_tutup_pendaftaran) -- BUKAN dari jam_mulai/
// jam_selesai di cfd_sessions. Itu urusan beda: jam_mulai/jam_selesai
// cfd_sessions nentuin kapan PETUGAS boleh scan QR buat verifikasi
// kehadiran fisik pedagang (lihat modules/petugas/scan-qr), yang jatuhnya
// belakangan setelah pedagang check-in dan dapet nomor stand.
func (r *LapakRepository) GetActiveSessionID(ctx context.Context) (string, error) {
	var id string
	err := r.db.QueryRow(ctx,
		`SELECT id FROM cfd_sessions
		 WHERE is_active = true AND deleted_at IS NULL AND tanggal = CURRENT_DATE
		 ORDER BY created_at DESC
		 LIMIT 1`,
	).Scan(&id)
	if err != nil {
		if err == pgx.ErrNoRows {
			return "", ErrTidakAdaSesiAktif
		}
		return "", err
	}

	isOpen, jamBuka, jamTutup, err := r.getStatusCheckIn(ctx)
	if err != nil {
		return "", err
	}
	if !isOpen {
		return "", ErrCheckInDitutup
	}

	now := time.Now().Format("15:04:05")
if jamBuka != nil && now < *jamBuka {
	return "", fmt.Errorf("%w: check-in baru dibuka jam %s", ErrDiluarJamCheckIn, formatJamSingkat(*jamBuka))
}
if jamTutup != nil && now >= *jamTutup {
	return "", fmt.Errorf("%w: check-in sudah ditutup sejak jam %s", ErrDiluarJamCheckIn, formatJamSingkat(*jamTutup))
}

return id, nil
}

func formatJamSingkat(jam string) string {
	if len(jam) >= 5 {
		return jam[:5]
	}
	return jam
}

// getStatusCheckIn baca Pengaturan Check-in Pedagang (tabel yang sama
// yang dulu dipakai buat gate pendaftaran -- pengaturan_pendaftaran).
// jam_buka/jam_tutup nullable: kalau NULL berarti gak ada batas jam,
// cuma is_open doang yang ngontrol.
func (r *LapakRepository) getStatusCheckIn(ctx context.Context) (isOpen bool, jamBuka, jamTutup *string, err error) {
	err = r.db.QueryRow(ctx,
		`SELECT is_open, jam_buka_pendaftaran::text, jam_tutup_pendaftaran::text
		 FROM pengaturan_pendaftaran
		 LIMIT 1`,
	).Scan(&isOpen, &jamBuka, &jamTutup)
	return isOpen, jamBuka, jamTutup, err
}

// GetPedagangProfileIDByUserID nerjemahin user_id (dari token JWT) ke
// pedagang_profiles.id (yang dipakai sebagai foreign key di lapak_klaim).
func (r *LapakRepository) GetPedagangProfileIDByUserID(ctx context.Context, userID string) (string, error) {
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

// ListKecamatan ambil semua kecamatan (master_instansi dengan nama_unit = 'Kecamatan').
func (r *LapakRepository) ListKecamatan(ctx context.Context) ([]entity.KecamatanDTO, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, nama_instansi FROM master_instansi
		 WHERE nama_unit = 'Kecamatan' AND deleted_at IS NULL
		 ORDER BY nama_instansi ASC`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := make([]entity.KecamatanDTO, 0)
	for rows.Next() {
		var k entity.KecamatanDTO
		if err := rows.Scan(&k.ID, &k.Nama); err != nil {
			return nil, err
		}
		list = append(list, k)
	}
	return list, rows.Err()
}

// ListJalanByKecamatan ambil semua jalan di 1 kecamatan, beserta sisa
// kapasitasnya untuk sesi yang lagi aktif sekarang.
func (r *LapakRepository) ListJalanByKecamatan(ctx context.Context, kecamatanID, sessionID string) ([]entity.JalanDTO, error) {
	rows, err := r.db.Query(ctx,
		`SELECT j.id, j.kode_jalan, j.nama_jalan, j.kapasitas,
		        COALESCE(jks.terisi, 0) AS terisi
		 FROM master_jalan j
		 JOIN jalan_instansi ji ON ji.jalan_id = j.id
		 LEFT JOIN jalan_kapasitas_sesi jks
		        ON jks.jalan_id = j.id AND jks.session_id = $2
		 WHERE ji.instansi_id = $1 AND j.deleted_at IS NULL
		 ORDER BY j.nama_jalan ASC`,
		kecamatanID, sessionID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := make([]entity.JalanDTO, 0)
	for rows.Next() {
		var j entity.JalanDTO
		if err := rows.Scan(&j.ID, &j.KodeJalan, &j.NamaJalan, &j.Kapasitas, &j.Terisi); err != nil {
			return nil, err
		}
		j.Sisa = j.Kapasitas - j.Terisi
		if j.Sisa < 0 {
			j.Sisa = 0
		}
		j.Penuh = j.Sisa <= 0
		list = append(list, j)
	}
	return list, rows.Err()
}

// ClaimLapak adalah jantung fitur "war" -- transaksi ini yang mastiin gak
// ada 2 pedagang rebutan jalan yang sama dapet nomor yang sama, walau
// request-nya masuk nyaris bersamaan.
func (r *LapakRepository) ClaimLapak(ctx context.Context, pedagangID, sessionID, jalanID string) (nomorLapak string, namaJalan string, claimedAt time.Time, err error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return "", "", time.Time{}, err
	}
	defer tx.Rollback(ctx) // aman dipanggil walau udah Commit, jadi no-op

	// Pastikan ada baris kapasitas buat jalan+sesi ini (kalau ini klaim
	// pertama di jalan itu untuk sesi ini, baris belum tentu ada).
	_, err = tx.Exec(ctx,
		`INSERT INTO jalan_kapasitas_sesi (jalan_id, session_id, terisi)
		 VALUES ($1, $2, 0)
		 ON CONFLICT (jalan_id, session_id) DO NOTHING`,
		jalanID, sessionID,
	)
	if err != nil {
		return "", "", time.Time{}, err
	}

	// KUNCI baris ini. Kalau ada request lain yang lagi klaim jalan yang
	// SAMA di saat bersamaan, dia bakal nunggu di baris ini sampai
	// transaksi kita commit/rollback.
	var terisi, kapasitas int
	var namaJalanRow string
	err = tx.QueryRow(ctx,
		`SELECT jks.terisi, j.kapasitas, j.nama_jalan
		 FROM jalan_kapasitas_sesi jks
		 JOIN master_jalan j ON j.id = jks.jalan_id
		 WHERE jks.jalan_id = $1 AND jks.session_id = $2
		 FOR UPDATE`,
		jalanID, sessionID,
	).Scan(&terisi, &kapasitas, &namaJalanRow)
	if err != nil {
		return "", "", time.Time{}, err
	}

	if terisi >= kapasitas {
		return "", "", time.Time{}, ErrLapakPenuh
	}

	nomorBaru := terisi + 1

	_, err = tx.Exec(ctx,
		`UPDATE jalan_kapasitas_sesi
		 SET terisi = $1, updated_at = now()
		 WHERE jalan_id = $2 AND session_id = $3`,
		nomorBaru, jalanID, sessionID,
	)
	if err != nil {
		return "", "", time.Time{}, err
	}

	nomorLapakStr := itoa(nomorBaru)

	var claimedAtRow time.Time
	err = tx.QueryRow(ctx,
		`INSERT INTO lapak_klaim (pedagang_id, session_id, jalan_id, nomor_lapak, claimed_at)
		 VALUES ($1, $2, $3, $4, now())
		 RETURNING claimed_at`,
		pedagangID, sessionID, jalanID, nomorLapakStr,
	).Scan(&claimedAtRow)
	if err != nil {
		// Kemungkinan besar unique constraint (pedagang_id, session_id) --
		// pedagang ini udah pernah klaim di sesi ini sebelumnya.
		return "", "", time.Time{}, ErrSudahKlaim
	}

	if err := tx.Commit(ctx); err != nil {
		return "", "", time.Time{}, err
	}

	return nomorLapakStr, namaJalanRow, claimedAtRow, nil
}

// GetKlaimByPedagangSession cek apakah pedagang ini udah klaim lapak di sesi
// yang dikasih.
func (r *LapakRepository) GetKlaimByPedagangSession(ctx context.Context, pedagangID, sessionID string) (nomorLapak, namaJalan, namaKecamatan string, claimedAt time.Time, found bool, err error) {
	err = r.db.QueryRow(ctx,
		`SELECT lk.nomor_lapak, j.nama_jalan, mi.nama_instansi, lk.claimed_at
		 FROM lapak_klaim lk
		 JOIN master_jalan j ON j.id = lk.jalan_id
		 JOIN jalan_instansi ji ON ji.jalan_id = j.id
		 JOIN master_instansi mi ON mi.id = ji.instansi_id AND mi.nama_unit = 'Kecamatan'
		 WHERE lk.pedagang_id = $1 AND lk.session_id = $2`,
		pedagangID, sessionID,
	).Scan(&nomorLapak, &namaJalan, &namaKecamatan, &claimedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return "", "", "", time.Time{}, false, nil
		}
		return "", "", "", time.Time{}, false, err
	}
	return nomorLapak, namaJalan, namaKecamatan, claimedAt, true, nil
}

func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	neg := n < 0
	if neg {
		n = -n
	}
	var b []byte
	for n > 0 {
		b = append([]byte{byte('0' + n%10)}, b...)
		n /= 10
	}
	if neg {
		b = append([]byte{'-'}, b...)
	}
	return string(b)
}