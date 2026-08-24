-- ============================================================
-- MIGRASI 000025: Sesuaikan pedagang_profiles dengan form
-- pendaftaran baru (single-page, tanpa verified/unverified dulu)
-- ============================================================

-- 1. Bikin ENUM buat jenis_dagangan (cuma 2 kategori)
CREATE TYPE jenis_dagangan_enum AS ENUM ('makanan_minuman', 'bukan_makanan_minuman');

-- 2. Bikin ENUM buat jenis_lapak (baru)
CREATE TYPE jenis_lapak_enum AS ENUM ('rombong', 'meja');

-- 3. Tambah kolom baru
ALTER TABLE pedagang_profiles ADD COLUMN IF NOT EXISTS nama_lengkap VARCHAR(150);
ALTER TABLE pedagang_profiles ADD COLUMN IF NOT EXISTS tanggal_lahir DATE;
ALTER TABLE pedagang_profiles ADD COLUMN IF NOT EXISTS jenis_lapak jenis_lapak_enum;

-- 4. Konversi jenis_dagangan dari VARCHAR ke ENUM.
--    Data testing lama ("gym", "usus sate", dll) otomatis jadi NULL
--    karena gak cocok sama 2 nilai valid -- sudah dikonfirmasi aman.
ALTER TABLE pedagang_profiles
    ALTER COLUMN jenis_dagangan TYPE jenis_dagangan_enum
    USING (
        CASE
            WHEN jenis_dagangan = 'makanan_minuman' THEN 'makanan_minuman'::jenis_dagangan_enum
            WHEN jenis_dagangan = 'bukan_makanan_minuman' THEN 'bukan_makanan_minuman'::jenis_dagangan_enum
            ELSE NULL
        END
    );