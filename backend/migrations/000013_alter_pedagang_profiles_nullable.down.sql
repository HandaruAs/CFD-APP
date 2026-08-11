-- ============================================
-- Rollback: Kembalikan ke struktur lama
-- ============================================

-- 1. Kembalikan NOT NULL
ALTER TABLE pedagang_profiles 
    ALTER COLUMN nik SET NOT NULL,
    ALTER COLUMN nama_usaha SET NOT NULL,
    ALTER COLUMN jenis_dagangan SET NOT NULL,
    ALTER COLUMN alamat SET NOT NULL;

-- 2. Hapus index baru
DROP INDEX IF EXISTS idx_pedagang_profiles_user_id;
DROP INDEX IF EXISTS idx_pedagang_nik_active;

-- 3. Kembalikan index lama
CREATE UNIQUE INDEX idx_pedagang_nik_active 
    ON pedagang_profiles (nik) 
    WHERE deleted_at IS NULL;

-- 4. Drop kolom yang ditambahkan
ALTER TABLE pedagang_profiles 
    DROP COLUMN IF EXISTS phone,
    DROP COLUMN IF EXISTS submitted_at;