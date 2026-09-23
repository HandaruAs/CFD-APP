-- ==========================================
-- SEEDER: Ruas Jalan (master_jalan.ruas, JSONB)
-- Tanggal: 23 September 2026
-- ==========================================
--
-- Membagi setiap jalan jadi beberapa ruas dengan kuota dibagi rata dari
-- kapasitas jalan (sisa pembagian dikasih ke ruas paling awal), mis.
-- kapasitas 25 dengan 5 ruas -> 5 ruas @5; kapasitas 18 dengan 4 ruas
-- -> 5, 5, 4, 4. Total kuota ruas = kapasitas jalan, jadi lolos validasi
-- modul Manajemen Lapak.
--
-- Jumlah ruas per jalan ditentukan dari kapasitas:
--   kapasitas <= 10 -> 2 ruas
--   kapasitas <= 15 -> 3 ruas
--   kapasitas <= 20 -> 4 ruas
--   selebihnya      -> 5 ruas
--
-- Nama ruas generik ("Ruas 1", "Ruas 2", ...) -- silakan diganti lewat
-- menu Manajemen Lapak kalau mau pakai nama asli (mis. "Pujasera").
--
-- AMAN diulang: jalan yang SUDAH punya ruas tidak disentuh sama sekali.
--
-- PENTING: jalankan SEBELUM menyiapkan lokasi (Acak Lapak) di sesi yang
-- sedang berjalan. Slot yang sudah dibuat tanpa ruas tidak dihitung
-- sebagai milik ruas mana pun.
--
-- Butuh: seeder 000001_seed_kecamatan_dan_jalan.sql sudah dijalankan.

DO $$
DECLARE
    j            RECORD;
    jumlah_ruas  INT;
    kuota_dasar  INT;
    sisa         INT;
    kuota_ruas   INT;
    nomor_mulai  INT;
    daftar_ruas  JSONB;
    i            INT;
    total_jalan  INT := 0;
BEGIN
    FOR j IN
        SELECT id, nama_jalan, kapasitas
        FROM master_jalan
        WHERE deleted_at IS NULL
          AND (ruas IS NULL OR ruas = '[]'::jsonb)
        ORDER BY nama_jalan
    LOOP
        jumlah_ruas := CASE
            WHEN j.kapasitas <= 10 THEN 2
            WHEN j.kapasitas <= 15 THEN 3
            WHEN j.kapasitas <= 20 THEN 4
            ELSE 5
        END;
        -- Jaga-jaga: jangan sampai ada ruas berkuota 0.
        jumlah_ruas := LEAST(jumlah_ruas, j.kapasitas);

        kuota_dasar := j.kapasitas / jumlah_ruas;
        sisa        := j.kapasitas % jumlah_ruas;
        nomor_mulai := 1;
        daftar_ruas := '[]'::jsonb;

        FOR i IN 1..jumlah_ruas LOOP
            kuota_ruas := kuota_dasar + CASE WHEN i <= sisa THEN 1 ELSE 0 END;

            daftar_ruas := daftar_ruas || jsonb_build_array(jsonb_build_object(
                'id',           gen_random_uuid()::text,
                'namaRuas',     'Ruas ' || i,
                'urutan',       i,
                'nomorMulai',   nomor_mulai,
                'nomorSelesai', nomor_mulai + kuota_ruas - 1,
                'kuota',        kuota_ruas
            ));

            nomor_mulai := nomor_mulai + kuota_ruas;
        END LOOP;

        UPDATE master_jalan
        SET ruas = daftar_ruas, updated_at = now()
        WHERE id = j.id;

        total_jalan := total_jalan + 1;
        RAISE NOTICE '% (kapasitas %) -> % ruas', j.nama_jalan, j.kapasitas, jumlah_ruas;
    END LOOP;

    RAISE NOTICE 'Selesai: % jalan diberi ruas.', total_jalan;
END $$;

-- Cek hasil:
-- SELECT nama_jalan, kapasitas,
--        jsonb_array_length(ruas) AS jumlah_ruas,
--        (SELECT SUM((e->>'kuota')::int) FROM jsonb_array_elements(ruas) e) AS total_kuota_ruas
-- FROM master_jalan
-- WHERE deleted_at IS NULL
-- ORDER BY nama_jalan;