package repository

import (
	"context"
	"errors"

	"cfd-backend/modules/petugas/acak-lapak/entity"
	"cfd-backend/modules/shared/kodelapak"

	"github.com/jackc/pgx/v5"
)

var (
	ErrScopeTidakValid     = errors.New("cakupan tidak valid")
	ErrKecamatanWajibDiisi = errors.New("kecamatan_id wajib diisi untuk scope kecamatan")
	ErrJalanWajibDiisi     = errors.New("jalan_id wajib diisi untuk scope jalan")
)

// GetWilayahPetugas ambil kecamatan_id / jalan_id yang ditugaskan ke
// petugas (kolom users.kecamatan_id & users.jalan_id -- sama kolom yang
// dipakai modules/operasional buat "Sesi per Wilayah"). Kalau dua-duanya
// NULL, petugas dianggap bebas (boleh generate slot di wilayah manapun).
func (r *AcakLapakRepository) GetWilayahPetugas(ctx context.Context, userID string) (*entity.WilayahPetugasSlot, error) {
	var kecID, jlnID *string
	err := r.db.QueryRow(ctx, `
		SELECT kecamatan_id, jalan_id FROM users
		WHERE id = $1 AND deleted_at IS NULL
	`, userID).Scan(&kecID, &jlnID)
	if err != nil {
		return nil, err
	}
	return &entity.WilayahPetugasSlot{
		KecamatanID: kecID,
		JalanID:     jlnID,
		Bebas:       kecID == nil && jlnID == nil,
	}, nil
}

// JalanUntukScope ambil daftar jalan_id sesuai cakupan yang dipilih
// petugas -- padanan operasional_repository.JalanUntukScope, cuma pakai
// entity.Scope* punya modul ini sendiri.
func (r *AcakLapakRepository) JalanUntukScope(ctx context.Context, scope string, kecamatanID, jalanID *string) ([]string, error) {
	var rows pgx.Rows
	var err error
	switch scope {
	case entity.ScopeKota:
		rows, err = r.db.Query(ctx, `SELECT id FROM master_jalan WHERE deleted_at IS NULL`)
	case entity.ScopeKecamatan:
		if kecamatanID == nil {
			return nil, ErrKecamatanWajibDiisi
		}
		rows, err = r.db.Query(ctx, `
			SELECT mj.id FROM master_jalan mj
			JOIN jalan_instansi ji ON ji.jalan_id = mj.id
			WHERE ji.instansi_id = $1 AND mj.deleted_at IS NULL
		`, kecamatanID)
	case entity.ScopeJalan:
		if jalanID == nil {
			return nil, ErrJalanWajibDiisi
		}
		return []string{*jalanID}, nil
	default:
		return nil, ErrScopeTidakValid
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	ids := make([]string, 0)
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	return ids, rows.Err()
}

// GetKodeEvent baca kode event aktif (mis. "CFD") dari Pengaturan
// Pendaftaran -- duplikat kecil dari modules/pedagang/lapak, dipakai
// sebagai prefix nomor_lapak yang di-generate di muka buat lapak_slot.
func (r *AcakLapakRepository) GetKodeEvent(ctx context.Context) (string, error) {
	var kode string
	err := r.db.QueryRow(ctx,
		`SELECT kode_event FROM pengaturan_pendaftaran LIMIT 1`,
	).Scan(&kode)
	if err != nil {
		return "", err
	}
	return kode, nil
}

// GetNamaKecamatan & GetNamaJalan: lookup kecil buat nyusun ScopeLabel
// di response GenerateSlot (mis. "Kec. Sukolilo" / "Jl. Kertajaya") --
// biar frontend gak perlu nyocokin ID ke nama sendiri.
func (r *AcakLapakRepository) GetNamaKecamatan(ctx context.Context, id string) (string, error) {
	var nama string
	err := r.db.QueryRow(ctx,
		`SELECT nama_instansi FROM master_instansi
		 WHERE id = $1 AND nama_unit = 'Kecamatan' AND deleted_at IS NULL`,
		id,
	).Scan(&nama)
	if err != nil {
		if err == pgx.ErrNoRows {
			return "", ErrKecamatanTidakDitemukan
		}
		return "", err
	}
	return nama, nil
}

func (r *AcakLapakRepository) GetNamaJalan(ctx context.Context, id string) (string, error) {
	var nama string
	err := r.db.QueryRow(ctx,
		`SELECT nama_jalan FROM master_jalan WHERE id = $1 AND deleted_at IS NULL`,
		id,
	).Scan(&nama)
	if err != nil {
		if err == pgx.ErrNoRows {
			return "", ErrJalanTidakDitemukan
		}
		return "", err
	}
	return nama, nil
}

// jalanKapasitas: hasil lookup 1 jalan buat keperluan GenerateSlot.
type jalanKapasitas struct {
	id        string
	namaJalan string
	kapasitas int
	sudahAda  int // jumlah baris lapak_slot yang sudah ada buat jalan+sesi ini (status apapun)
}

const maxPercobaanKodeSlot = 20

// GenerateSlot isi lapak_slot buat tiap jalan di jalanIDs, sejumlah SISA
// kapasitas yang belum ke-provision (kapasitas jalan - jumlah slot yang
// udah ada di sesi ini, status apapun). Idempotent by design: petugas
// klik ulang gak bikin over-provision, cuma nambahin kekurangannya aja
// (misal kapasitas jalan baru dinaikkan admin).
//
// jumlahSlotDibuat = slot baru yang barusan dibikin (buat pesan ke petugas).
// jumlahSlotAda    = total slot yang sekarang ada (lama + baru) buat jalan-jalan itu.
func (r *AcakLapakRepository) GenerateSlot(
	ctx context.Context,
	sessionID string,
	jalanIDs []string,
	kodeEvent string,
	generatedBy *string,
) (jumlahSlotDibuat int, jumlahSlotAda int, err error) {
	if len(jalanIDs) == 0 {
		return 0, 0, nil
	}

	tx, err := r.db.Begin(ctx)
	if err != nil {
		return 0, 0, err
	}
	defer tx.Rollback(ctx)

	for _, jalanID := range jalanIDs {
		var jk jalanKapasitas
		jk.id = jalanID
		err = tx.QueryRow(ctx,
			`SELECT nama_jalan, kapasitas FROM master_jalan
			 WHERE id = $1 AND deleted_at IS NULL`,
			jalanID,
		).Scan(&jk.namaJalan, &jk.kapasitas)
		if err != nil {
			if err == pgx.ErrNoRows {
				return 0, 0, ErrJalanTidakDitemukan
			}
			return 0, 0, err
		}

		err = tx.QueryRow(ctx,
			`SELECT COUNT(*) FROM lapak_slot WHERE jalan_id = $1 AND session_id = $2`,
			jalanID, sessionID,
		).Scan(&jk.sudahAda)
		if err != nil {
			return 0, 0, err
		}

		kurang := jk.kapasitas - jk.sudahAda
		totalDiJalanIni := jk.sudahAda
		for i := 0; i < kurang; i++ {
			inserted := false
			for percobaan := 0; percobaan < maxPercobaanKodeSlot; percobaan++ {
				kode := kodelapak.Generate(kodeEvent)
				_, errInsert := tx.Exec(ctx,
					`INSERT INTO lapak_slot (session_id, jalan_id, nomor_lapak, status, generated_by)
					 VALUES ($1, $2, $3, 'tersedia', $4)`,
					sessionID, jalanID, kode, generatedBy,
				)
				if errInsert == nil {
					inserted = true
					break
				}
				if kodelapak.IsUniqueViolation(errInsert, "") {
					continue // nomor_lapak-nya tabrakan, coba kode baru
				}
				return 0, 0, errInsert
			}
			if !inserted {
				return 0, 0, errors.New("gagal generate kode lapak yang unik buat slot, coba lagi")
			}
			jumlahSlotDibuat++
			totalDiJalanIni++
		}
		jumlahSlotAda += totalDiJalanIni
	}

	if err := tx.Commit(ctx); err != nil {
		return 0, 0, err
	}
	return jumlahSlotDibuat, jumlahSlotAda, nil
}