package repository

import (
	"context"
	"errors"
	"time"

	"cfd-backend/modules/pedagang/lapak/entity"
	"cfd-backend/modules/shared/kodelapak"
	"cfd-backend/modules/shared/sesi"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrLapakBelumDiacak       = errors.New("lapak belum diacak petugas, silakan coba lagi nanti")
	ErrSudahKlaim             = errors.New("kamu sudah klaim lapak di sesi ini")
	ErrPedagangTidakDitemukan = errors.New("profil pedagang tidak ditemukan")
)

type LapakRepository struct {
	db *pgxpool.Pool
}

func NewLapakRepository(db *pgxpool.Pool) *LapakRepository {
	return &LapakRepository{db: db}
}

// GetOrCreateSessionHariIni delegasi ke resolver bersama -- lihat
// modules/shared/sesi.ResolveSesiHariIni buat penjelasan lengkap kenapa
// row auto-hidden (is_active=false) ini dibutuhkan.
func (r *LapakRepository) GetOrCreateSessionHariIni(ctx context.Context) (string, error) {
	return sesi.ResolveSesiHariIni(ctx, r.db)
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

// GetKodeEvent baca kode event aktif sekarang (mis. "CFD") dari Pengaturan
// Pendaftaran -- field yang sama yang diisi petugas di halaman Jam
// Operasional. Dipakai sebagai prefix nomor_lapak.
func (r *LapakRepository) GetKodeEvent(ctx context.Context) (string, error) {
	var kode string
	err := r.db.QueryRow(ctx,
		`SELECT kode_event FROM pengaturan_pendaftaran LIMIT 1`,
	).Scan(&kode)
	if err != nil {
		return "", err
	}
	return kode, nil
}

const maxPercobaanSlot = 5

// ClaimSlot: ambil 1 slot 'tersedia' dari pool lapak_slot (yang udah
// disiapin petugas lewat "Acak Lapak" -- lihat modules/petugas/acak-lapak
// GenerateSlot), tandain 'terpakai', DAN tetap nulis row baru ke
// lapak_klaim persis kayak alur lama -- biar checkout, check-in
// (scan-qr), laporan, dan widget Sisa Lapak yang udah jalan sekarang
// SEMUA gak perlu diubah sama sekali (mereka baca dari lapak_klaim /
// jalan_kapasitas_sesi, bukan dari lapak_slot).
//
// FOR UPDATE SKIP LOCKED di SELECT slot-nya: kalau 2 pedagang klaim
// nyaris bersamaan, yang kedua otomatis lompat ke slot lain yang belum
// dikunci transaksi pertama -- gak saling nunggu/nabrak.
func (r *LapakRepository) ClaimSlot(ctx context.Context, pedagangID, sessionID string) (nomorLapak, namaJalan, namaKecamatan string, claimedAt time.Time, err error) {
	var sudahKlaim bool
	err = r.db.QueryRow(ctx,
		`SELECT EXISTS(SELECT 1 FROM lapak_klaim WHERE pedagang_id = $1 AND session_id = $2 AND status = 'aktif')`,
		pedagangID, sessionID,
	).Scan(&sudahKlaim)
	if err != nil {
		return "", "", "", time.Time{}, err
	}
	if sudahKlaim {
		return "", "", "", time.Time{}, ErrSudahKlaim
	}

	for percobaan := 0; percobaan < maxPercobaanSlot; percobaan++ {
		nomor, jalan, kecamatan, claimedAtRow, errTry := r.tryClaimSatuSlot(ctx, pedagangID, sessionID)
		if errTry == nil {
			return nomor, jalan, kecamatan, claimedAtRow, nil
		}
		if errors.Is(errTry, errSlotKalahRace) {
			continue // slot yang kepilih keburu diambil transaksi lain, coba lagi
		}
		return "", "", "", time.Time{}, errTry
	}

	return "", "", "", time.Time{}, ErrLapakBelumDiacak
}

// errSlotKalahRace: sinyal internal doang (gak pernah keluar dari
// ClaimSlot) -- dipakai buat mbedain "slot yang kepilih ternyata udah
// keambil orang lain, coba slot lain" dari error yang beneran fatal.
var errSlotKalahRace = errors.New("slot kalah race")

func (r *LapakRepository) tryClaimSatuSlot(ctx context.Context, pedagangID, sessionID string) (nomorLapak, namaJalan, namaKecamatan string, claimedAt time.Time, err error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return "", "", "", time.Time{}, err
	}
	defer tx.Rollback(ctx)

	var slotID, jalanID, kode string
	var ruasID *string // NULL kalau slot-nya dari jalan yang belum dibagi ruas
	err = tx.QueryRow(ctx,
		`SELECT ls.id, ls.jalan_id, ls.ruas_id, ls.nomor_lapak, mj.nama_jalan, mi.nama_instansi
		 FROM lapak_slot ls
		 JOIN master_jalan mj ON mj.id = ls.jalan_id
		 JOIN jalan_instansi ji ON ji.jalan_id = mj.id
		 JOIN master_instansi mi ON mi.id = ji.instansi_id AND mi.nama_unit = 'Kecamatan'
		 WHERE ls.session_id = $1 AND ls.status = 'tersedia'
		 ORDER BY random()
		 LIMIT 1
		 FOR UPDATE OF ls SKIP LOCKED`,
		sessionID,
	).Scan(&slotID, &jalanID, &ruasID, &kode, &namaJalan, &namaKecamatan)
	if err != nil {
		if err == pgx.ErrNoRows {
			return "", "", "", time.Time{}, ErrLapakBelumDiacak
		}
		return "", "", "", time.Time{}, err
	}

	// Slot ini bisa aja udah dipakein (status berubah) di antara SELECT
	// di atas selesai dan UPDATE di bawah jalan -- praktis gak mungkin
	// berkat FOR UPDATE SKIP LOCKED, tapi tetap dicek biar aman kalau
	// suatu saat locking-nya berubah.
	tag, err := tx.Exec(ctx,
		`UPDATE lapak_slot SET status = 'terpakai', updated_at = now()
		 WHERE id = $1 AND status = 'tersedia'`,
		slotID,
	)
	if err != nil {
		return "", "", "", time.Time{}, err
	}
	if tag.RowsAffected() == 0 {
		return "", "", "", time.Time{}, errSlotKalahRace
	}

	var klaimID string
	err = tx.QueryRow(ctx,
		`INSERT INTO lapak_klaim (pedagang_id, session_id, jalan_id, ruas_id, nomor_lapak, claimed_at)
		 VALUES ($1, $2, $3, $4, $5, now())
		 RETURNING id, claimed_at`,
		pedagangID, sessionID, jalanID, ruasID, kode,
	).Scan(&klaimID, &claimedAt)
	if err != nil {
		if kodelapak.IsUniqueViolation(err, "") {
			// Constraint (pedagang_id, session_id) -- pedagang ini udah
			// klaim duluan di tx lain nyaris bersamaan.
			return "", "", "", time.Time{}, ErrSudahKlaim
		}
		return "", "", "", time.Time{}, err
	}

	if _, err := tx.Exec(ctx,
		`UPDATE lapak_slot SET lapak_klaim_id = $1 WHERE id = $2`,
		klaimID, slotID,
	); err != nil {
		return "", "", "", time.Time{}, err
	}

	// jalan_kapasitas_sesi tetap di-increment kayak alur lama -- ini yang
	// dibaca widget Sisa Lapak (petugas & publik), BUKAN dihitung dari
	// lapak_slot.
	if _, err := tx.Exec(ctx,
		`INSERT INTO jalan_kapasitas_sesi (jalan_id, session_id, terisi)
		 VALUES ($1, $2, 0)
		 ON CONFLICT (jalan_id, session_id) DO NOTHING`,
		jalanID, sessionID,
	); err != nil {
		return "", "", "", time.Time{}, err
	}
	if _, err := tx.Exec(ctx,
		`UPDATE jalan_kapasitas_sesi SET terisi = terisi + 1, updated_at = now()
		 WHERE jalan_id = $1 AND session_id = $2`,
		jalanID, sessionID,
	); err != nil {
		return "", "", "", time.Time{}, err
	}

	if err := tx.Commit(ctx); err != nil {
		return "", "", "", time.Time{}, err
	}
	return kode, namaJalan, namaKecamatan, claimedAt, nil
}

func (r *LapakRepository) GetKlaimByPedagangSession(ctx context.Context, pedagangID, sessionID string) (nomorLapak, namaJalan, namaKecamatan string, claimedAt time.Time, found bool, err error) {
	err = r.db.QueryRow(ctx,
		`SELECT lk.nomor_lapak, j.nama_jalan, mi.nama_instansi, lk.claimed_at
		 FROM lapak_klaim lk
		 JOIN master_jalan j ON j.id = lk.jalan_id
		 JOIN jalan_instansi ji ON ji.jalan_id = j.id
		 JOIN master_instansi mi ON mi.id = ji.instansi_id AND mi.nama_unit = 'Kecamatan'
		 WHERE lk.pedagang_id = $1 AND lk.session_id = $2 AND lk.status = 'aktif'`,
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
// GetNamaRuasKlaim: nama ruas dari klaim aktif pedagang di sesi ini. Ruas
// disimpan di JSONB master_jalan.ruas, jadi dicocokkan lewat id-nya
// (lapak_klaim.ruas_id). Balikin "" kalau klaimnya tanpa ruas / belum klaim.
func (r *LapakRepository) GetNamaRuasKlaim(ctx context.Context, pedagangID, sessionID string) (string, error) {
	var namaRuas string
	err := r.db.QueryRow(ctx,
		`SELECT COALESCE((
		     SELECT e->>'namaRuas'
		     FROM jsonb_array_elements(j.ruas) e
		     WHERE e->>'id' = lk.ruas_id
		     LIMIT 1
		 ), '')
		 FROM lapak_klaim lk
		 JOIN master_jalan j ON j.id = lk.jalan_id
		 WHERE lk.pedagang_id = $1 AND lk.session_id = $2 AND lk.status = 'aktif'`,
		pedagangID, sessionID,
	).Scan(&namaRuas)
	if err != nil {
		if err == pgx.ErrNoRows {
			return "", nil
		}
		return "", err
	}
	return namaRuas, nil
}