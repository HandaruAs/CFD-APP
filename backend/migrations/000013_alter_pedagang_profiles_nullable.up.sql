-- ============================================
-- Ubah kolom di pedagang_profiles jadi nullable
-- Biar register akun cukup isi nama, email, password
-- ============================================

-- 1. Hapus constraint NOT NULL dari kolom
ALTER TABLE pedagang_profiles 
    ALTER COLUMN nik DROP NOT NULL,
    ALTER COLUMN nama_usaha DROP NOT NULL,
    ALTER COLUMN jenis_dagangan DROP NOT NULL,
    ALTER COLUMN alamat DROP NOT NULL;

-- 2. Hapus unique index yang lama (karena nik bisa NULL)
DROP INDEX IF EXISTS idx_pedagang_nik_active;

-- 3. Buat ulang unique index dengan partial WHERE nik IS NOT NULL
--    Biar multiple NULL tidak dianggap duplicate
CREATE UNIQUE INDEX idx_pedagang_nik_active 
    ON pedagang_profiles (nik) 
    WHERE deleted_at IS NULL AND nik IS NOT NULL;

-- 4. Tambahkan kolom phone (opsional) 
--    (kalau belum ada di tabel)
ALTER TABLE pedagang_profiles 
    ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

-- 5. Tambahkan kolom submitted_at untuk tracking kapan data diajukan
ALTER TABLE pedagang_profiles 
    ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;

-- 6. Ubah status_verifikasi default jadi 'pending' 
--    (sebenarnya sudah, tapi biar aman)
ALTER TABLE pedagang_profiles 
    ALTER COLUMN status_verifikasi SET DEFAULT 'pending';

-- 7. Tambahkan index untuk user_id (buat akses cepat)
CREATE INDEX IF NOT EXISTS idx_pedagang_profiles_user_id 
    ON pedagang_profiles(user_id);