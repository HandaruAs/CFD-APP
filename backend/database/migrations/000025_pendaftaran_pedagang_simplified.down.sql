-- ============================================================
-- ROLLBACK MIGRASI 000025
-- ============================================================

ALTER TABLE pedagang_profiles
    ALTER COLUMN jenis_dagangan TYPE VARCHAR(100)
    USING (jenis_dagangan::text);

ALTER TABLE pedagang_profiles DROP COLUMN IF EXISTS jenis_lapak;
ALTER TABLE pedagang_profiles DROP COLUMN IF EXISTS tanggal_lahir;
ALTER TABLE pedagang_profiles DROP COLUMN IF EXISTS nama_lengkap;

DROP TYPE IF EXISTS jenis_lapak_enum;
DROP TYPE IF EXISTS jenis_dagangan_enum;