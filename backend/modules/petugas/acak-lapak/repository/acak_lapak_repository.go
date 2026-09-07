package repository

import (
	"context"
	"errors"
	"math/rand/v2"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrTidakAdaSesiAktif       = errors.New("tidak ada sesi CFD yang aktif hari ini")
	ErrJalanTidakDitemukan     = errors.New("jalan tidak ditemukan")
	ErrKecamatanTidakDitemukan = errors.New("kecamatan tidak ditemukan")
)

type AcakLapakRepository struct {
	db *pgxpool.Pool
}

func NewAcakLapakRepository(db *pgxpool.Pool) *AcakLapakRepository {
	return &AcakLapakRepository{db: db}
}

// GetActiveSessionID ambil sesi CFD hari ini. Beda sama modul pedagang/lapak,
// di sini SENGAJA gak digembok jam/status check-in pendaftaran -- petugas
// boleh mengacak lapak kapan pun selama sesi hari ini masih aktif, gak
// peduli jam check-in pedagang lagi buka atau tutup.
func (r *AcakLapakRepository) GetActiveSessionID(ctx context.Context) (string, error) {
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
	return id, nil
}

// AcakJalan mengacak ulang nomor_lapak semua pedagang yang sudah klaim di
// 1 jalan, untuk sesi yang diberikan.
func (r *AcakLapakRepository) AcakJalan(ctx context.Context, sessionID, jalanID string) (namaJalan string, jumlahDiacak int, err error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return "", 0, err
	}
	defer tx.Rollback(ctx)

	namaJalan, jumlahDiacak, err = shuffleJalanTx(ctx, tx, jalanID, sessionID)
	if err != nil {
		return "", 0, err
	}

	if err := tx.Commit(ctx); err != nil {
		return "", 0, err
	}
	return namaJalan, jumlahDiacak, nil
}

// AcakKecamatan mengacak ulang nomor_lapak untuk SEMUA jalan yang ada di 1
// kecamatan sekaligus, dalam 1 transaksi (semua jalan diacak, atau kalau
// ada yang gagal, semuanya dibatalkan).
func (r *AcakLapakRepository) AcakKecamatan(ctx context.Context, sessionID, kecamatanID string) (namaKecamatan string, jumlahJalan int, jumlahDiacak int, err error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return "", 0, 0, err
	}
	defer tx.Rollback(ctx)

	err = tx.QueryRow(ctx,
		`SELECT nama_instansi FROM master_instansi
		 WHERE id = $1 AND nama_unit = 'Kecamatan' AND deleted_at IS NULL`,
		kecamatanID,
	).Scan(&namaKecamatan)
	if err != nil {
		if err == pgx.ErrNoRows {
			return "", 0, 0, ErrKecamatanTidakDitemukan
		}
		return "", 0, 0, err
	}

	rows, err := tx.Query(ctx,
		`SELECT j.id
		 FROM master_jalan j
		 JOIN jalan_instansi ji ON ji.jalan_id = j.id
		 WHERE ji.instansi_id = $1 AND j.deleted_at IS NULL
		 ORDER BY j.id ASC`,
		kecamatanID,
	)
	if err != nil {
		return "", 0, 0, err
	}
	jalanIDs := make([]string, 0)
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			rows.Close()
			return "", 0, 0, err
		}
		jalanIDs = append(jalanIDs, id)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return "", 0, 0, err
	}

	for _, jalanID := range jalanIDs {
		_, count, err := shuffleJalanTx(ctx, tx, jalanID, sessionID)
		if err != nil {
			return "", 0, 0, err
		}
		jumlahDiacak += count
	}

	if err := tx.Commit(ctx); err != nil {
		return "", 0, 0, err
	}
	return namaKecamatan, len(jalanIDs), jumlahDiacak, nil
}

// AcakSemua mengacak ulang nomor_lapak untuk SEMUA jalan yang punya minimal
// 1 klaim di sesi yang lagi aktif, se-Surabaya (semua kecamatan sekaligus),
// dalam 1 transaksi.
func (r *AcakLapakRepository) AcakSemua(ctx context.Context, sessionID string) (jumlahKecamatan, jumlahJalan, jumlahDiacak int, err error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return 0, 0, 0, err
	}
	defer tx.Rollback(ctx)

	rows, err := tx.Query(ctx,
		`SELECT DISTINCT lk.jalan_id
		 FROM lapak_klaim lk
		 WHERE lk.session_id = $1
		 ORDER BY lk.jalan_id ASC`,
		sessionID,
	)
	if err != nil {
		return 0, 0, 0, err
	}
	jalanIDs := make([]string, 0)
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			rows.Close()
			return 0, 0, 0, err
		}
		jalanIDs = append(jalanIDs, id)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return 0, 0, 0, err
	}

	for _, jalanID := range jalanIDs {
		_, count, err := shuffleJalanTx(ctx, tx, jalanID, sessionID)
		if err != nil {
			return 0, 0, 0, err
		}
		jumlahDiacak += count
	}

	// Hitung berapa kecamatan yang kesentuh (buat ringkasan di respons).
	err = tx.QueryRow(ctx,
		`SELECT COUNT(DISTINCT ji.instansi_id)
		 FROM lapak_klaim lk
		 JOIN jalan_instansi ji ON ji.jalan_id = lk.jalan_id
		 WHERE lk.session_id = $1`,
		sessionID,
	).Scan(&jumlahKecamatan)
	if err != nil {
		return 0, 0, 0, err
	}

	if err := tx.Commit(ctx); err != nil {
		return 0, 0, 0, err
	}
	return jumlahKecamatan, len(jalanIDs), jumlahDiacak, nil
}

// shuffleJalanTx adalah inti logika pengacakan, dipakai bareng-bareng sama
// AcakJalan (1 jalan), AcakKecamatan (loop banyak jalan), dan AcakSemua
// (loop semua jalan). Semua dalam 1 transaksi yang sama biar konsisten.
func shuffleJalanTx(ctx context.Context, tx pgx.Tx, jalanID, sessionID string) (namaJalan string, jumlahDiacak int, err error) {
	// Pastikan jalan-nya ada.
	err = tx.QueryRow(ctx,
		`SELECT nama_jalan FROM master_jalan WHERE id = $1 AND deleted_at IS NULL`,
		jalanID,
	).Scan(&namaJalan)
	if err != nil {
		if err == pgx.ErrNoRows {
			return "", 0, ErrJalanTidakDitemukan
		}
		return "", 0, err
	}

	// KUNCI baris kapasitas jalan ini kalau ada, biar gak bentrok sama
	// pedagang yang lagi nge-klaim lapak baru di jalan yang sama secara
	// bersamaan (ClaimLapak juga ngunci baris yang sama pakai FOR UPDATE).
	// Kalau baris kapasitasnya belum ada (belum pernah ada yang klaim di
	// jalan ini), ya berarti gak ada yang perlu dikunci -- aman diabaikan.
	var dummy int
	err = tx.QueryRow(ctx,
		`SELECT terisi FROM jalan_kapasitas_sesi WHERE jalan_id = $1 AND session_id = $2 FOR UPDATE`,
		jalanID, sessionID,
	).Scan(&dummy)
	if err != nil && err != pgx.ErrNoRows {
		return "", 0, err
	}

	// Ambil semua klaim di jalan+sesi ini, sekalian dikunci barisnya.
	rows, err := tx.Query(ctx,
		`SELECT id, nomor_lapak FROM lapak_klaim
		 WHERE jalan_id = $1 AND session_id = $2
		 ORDER BY id ASC
		 FOR UPDATE`,
		jalanID, sessionID,
	)
	if err != nil {
		return "", 0, err
	}
	type klaimRow struct {
		id         string
		nomorLapak string
	}
	klaims := make([]klaimRow, 0)
	for rows.Next() {
		var k klaimRow
		if err := rows.Scan(&k.id, &k.nomorLapak); err != nil {
			rows.Close()
			return "", 0, err
		}
		klaims = append(klaims, k)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return "", 0, err
	}

	if len(klaims) < 2 {
		// Gak ada apa-apa buat diacak (kosong atau cuma 1 pedagang).
		return namaJalan, len(klaims), nil
	}

	// Ambil kumpulan nomor yang lagi kepake, terus diacak urutannya, lalu
	// dibagi ulang ke pedagang yang sama -- total & rentang nomor gak
	// berubah, cuma siapa-dapet-nomor-berapa yang diacak.
	nomorNomor := make([]string, len(klaims))
	for i, k := range klaims {
		nomorNomor[i] = k.nomorLapak
	}
	rand.Shuffle(len(nomorNomor), func(i, j int) {
		nomorNomor[i], nomorNomor[j] = nomorNomor[j], nomorNomor[i]
	})

	for i, k := range klaims {
		_, err := tx.Exec(ctx,
			`UPDATE lapak_klaim SET nomor_lapak = $1 WHERE id = $2`,
			nomorNomor[i], k.id,
		)
		if err != nil {
			return "", 0, err
		}
	}

	return namaJalan, len(klaims), nil
}
