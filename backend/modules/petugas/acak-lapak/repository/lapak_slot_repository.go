package repository

import (
	"context"
	"encoding/json"
	"errors"

	"cfd-backend/modules/petugas/acak-lapak/entity"
	"cfd-backend/modules/shared/kodelapak"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

var (
	ErrScopeTidakValid     = errors.New("cakupan tidak valid")
	ErrKecamatanWajibDiisi = errors.New("kecamatan_id wajib diisi untuk scope kecamatan")
	ErrJalanWajibDiisi     = errors.New("jalan_id wajib diisi untuk scope jalan")
	ErrRuasWajibDiisi      = errors.New("ruas_id wajib diisi untuk scope ruas")
	ErrRuasTidakDitemukan  = errors.New("ruas tidak ditemukan di jalan ini")
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
	case entity.ScopeJalan, entity.ScopeRuas:
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

// ruasJSON: bentuk 1 elemen di kolom JSONB master_jalan.ruas (dikelola
// modul manajemen-lapak). Di sini cuma butuh id, nama, & kuota.
type ruasJSON struct {
	ID       string `json:"id"`
	NamaRuas string `json:"namaRuas"`
	Kuota    int    `json:"kuota"`
}

func decodeRuas(raw []byte) ([]ruasJSON, error) {
	var list []ruasJSON
	if len(raw) > 0 {
		if err := json.Unmarshal(raw, &list); err != nil {
			return nil, err
		}
	}
	return list, nil
}

// GetRuasJalan: daftar ruas milik 1 jalan, buat dropdown "Pilih Ruas".
func (r *AcakLapakRepository) GetRuasJalan(ctx context.Context, jalanID string) ([]entity.RuasOpsi, error) {
	var raw []byte
	err := r.db.QueryRow(ctx,
		`SELECT ruas FROM master_jalan WHERE id = $1 AND deleted_at IS NULL`,
		jalanID,
	).Scan(&raw)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, ErrJalanTidakDitemukan
		}
		return nil, err
	}
	list, err := decodeRuas(raw)
	if err != nil {
		return nil, err
	}
	hasil := make([]entity.RuasOpsi, 0, len(list))
	for _, ru := range list {
		hasil = append(hasil, entity.RuasOpsi{ID: ru.ID, NamaRuas: ru.NamaRuas, Kuota: ru.Kuota})
	}
	return hasil, nil
}

const maxPercobaanKodeSlot = 20

// GenerateSlot isi lapak_slot buat tiap jalan di jalanIDs. Idempotent:
// klik ulang gak bikin over-provision, cuma nambahin kekurangannya aja.
//
// Aturan jumlah slot per jalan:
//   - Jalan yang BELUM dibagi ruas: sejumlah kapasitas jalan (perilaku
//     lama), slot-nya ruas_id NULL.
//   - Jalan yang SUDAH dibagi ruas: dibuat per ruas, sejumlah kuota tiap
//     ruas (mis. jalan 100 kuota, 5 ruas @20 -> 20 slot per ruas),
//     slot-nya ruas_id = id ruas itu.
//   - ruasID != nil (scope ruas): cuma ruas itu saja di jalan tsb.
//
// Kalau hapusTersedia true, slot 'tersedia' (belum diklaim) di sesi ini
// dihapus dulu sebelum generate -- jadi pool yang bisa diklaim pedagang
// cuma hasil acak ini. hapusDiJalan nil = hapus di SEMUA jalan (admin
// bebas); kalau diisi, cuma slot di jalan-jalan itu yang dihapus (petugas
// wilayah gak boleh ngebuang pool wilayah lain). Slot 'terpakai' gak
// pernah dihapus.
//
// jumlahSlotDibuat  = slot baru yang barusan dibikin (buat pesan ke petugas).
// jumlahSlotAda     = total slot yang sekarang ada (lama + baru) buat scope ini.
// jumlahRuas        = jumlah ruas yang ikut disiapkan.
// jumlahSlotDihapus = slot lama belum diklaim yang dibuang.
func (r *AcakLapakRepository) GenerateSlot(
	ctx context.Context,
	sessionID string,
	jalanIDs []string,
	ruasID *string,
	kodeEvent string,
	generatedBy *string,
	hapusTersedia bool,
	hapusDiJalan []string,
) (jumlahSlotDibuat int, jumlahSlotAda int, jumlahRuas int, jumlahSlotDihapus int, err error) {
	if len(jalanIDs) == 0 {
		return 0, 0, 0, 0, nil
	}

	tx, err := r.db.Begin(ctx)
	if err != nil {
		return 0, 0, 0, 0, err
	}
	defer tx.Rollback(ctx)

	if hapusTersedia {
		var tag pgconn.CommandTag
		if hapusDiJalan == nil {
			tag, err = tx.Exec(ctx,
				`DELETE FROM lapak_slot WHERE session_id = $1 AND status = 'tersedia'`,
				sessionID,
			)
		} else {
			tag, err = tx.Exec(ctx,
				`DELETE FROM lapak_slot
				 WHERE session_id = $1 AND status = 'tersedia' AND jalan_id = ANY($2::uuid[])`,
				sessionID, hapusDiJalan,
			)
		}
		if err != nil {
			return 0, 0, 0, 0, err
		}
		jumlahSlotDihapus = int(tag.RowsAffected())
	}

	for _, jalanID := range jalanIDs {
		var kapasitas int
		var ruasRaw []byte
		err = tx.QueryRow(ctx,
			`SELECT kapasitas, ruas FROM master_jalan
			 WHERE id = $1 AND deleted_at IS NULL`,
			jalanID,
		).Scan(&kapasitas, &ruasRaw)
		if err != nil {
			if err == pgx.ErrNoRows {
				return 0, 0, 0, 0, ErrJalanTidakDitemukan
			}
			return 0, 0, 0, 0, err
		}
		ruasList, err := decodeRuas(ruasRaw)
		if err != nil {
			return 0, 0, 0, 0, err
		}

		// Scope ruas: saring ke 1 ruas yang diminta saja.
		if ruasID != nil {
			var pilihan []ruasJSON
			for _, ru := range ruasList {
				if ru.ID == *ruasID {
					pilihan = append(pilihan, ru)
					break
				}
			}
			if len(pilihan) == 0 {
				return 0, 0, 0, 0, ErrRuasTidakDitemukan
			}
			ruasList = pilihan
		}

		// Jalan tanpa ruas: perilaku lama, per jalan.
		if len(ruasList) == 0 {
			var sudahAda int
			err = tx.QueryRow(ctx,
				`SELECT COUNT(*) FROM lapak_slot WHERE jalan_id = $1 AND session_id = $2`,
				jalanID, sessionID,
			).Scan(&sudahAda)
			if err != nil {
				return 0, 0, 0, 0, err
			}
			dibuat, err := insertSlot(ctx, tx, kapasitas-sudahAda, sessionID, jalanID, nil, kodeEvent, generatedBy)
			if err != nil {
				return 0, 0, 0, 0, err
			}
			jumlahSlotDibuat += dibuat
			jumlahSlotAda += sudahAda + dibuat
			continue
		}

		// Jalan dengan ruas: per ruas, sejumlah kuota ruas.
		for _, ru := range ruasList {
			ruID := ru.ID
			var sudahAda int
			err = tx.QueryRow(ctx,
				`SELECT COUNT(*) FROM lapak_slot
				 WHERE jalan_id = $1 AND session_id = $2 AND ruas_id = $3`,
				jalanID, sessionID, ruID,
			).Scan(&sudahAda)
			if err != nil {
				return 0, 0, 0, 0, err
			}
			dibuat, err := insertSlot(ctx, tx, ru.Kuota-sudahAda, sessionID, jalanID, &ruID, kodeEvent, generatedBy)
			if err != nil {
				return 0, 0, 0, 0, err
			}
			jumlahSlotDibuat += dibuat
			jumlahSlotAda += sudahAda + dibuat
			jumlahRuas++
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return 0, 0, 0, 0, err
	}
	return jumlahSlotDibuat, jumlahSlotAda, jumlahRuas, jumlahSlotDihapus, nil
}

// insertSlot bikin `jumlah` slot baru (kalau jumlah <= 0, gak ngapa-ngapain)
// dengan kode lapak acak yang unik per sesi.
func insertSlot(
	ctx context.Context,
	tx pgx.Tx,
	jumlah int,
	sessionID, jalanID string,
	ruasID *string,
	kodeEvent string,
	generatedBy *string,
) (int, error) {
	dibuat := 0
	for i := 0; i < jumlah; i++ {
		inserted := false
		for percobaan := 0; percobaan < maxPercobaanKodeSlot; percobaan++ {
			kode := kodelapak.Generate(kodeEvent)
			_, errInsert := tx.Exec(ctx,
				`INSERT INTO lapak_slot (session_id, jalan_id, ruas_id, nomor_lapak, status, generated_by)
				 VALUES ($1, $2, $3, $4, 'tersedia', $5)`,
				sessionID, jalanID, ruasID, kode, generatedBy,
			)
			if errInsert == nil {
				inserted = true
				break
			}
			if kodelapak.IsUniqueViolation(errInsert, "") {
				continue // nomor_lapak-nya tabrakan, coba kode baru
			}
			return 0, errInsert
		}
		if !inserted {
			return 0, errors.New("gagal generate kode lapak yang unik buat slot, coba lagi")
		}
		dibuat++
	}
	return dibuat, nil
}