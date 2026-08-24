-- ============================================================
-- MIGRASI 000024: Tambah kolom untuk laporan
-- ============================================================

-- 1. Tambah kolom check_out_at di kehadiran_pedagang (untuk checkout)
ALTER TABLE kehadiran_pedagang 
ADD COLUMN IF NOT EXISTS check_out_at TIMESTAMPTZ;

-- 2. Tambah kolom omset di kehadiran_pedagang (diisi pedagang)
ALTER TABLE kehadiran_pedagang 
ADD COLUMN IF NOT EXISTS omset BIGINT;

-- 3. Tambah kolom lokasi_lapak di pedagang_profiles
ALTER TABLE pedagang_profiles 
ADD COLUMN IF NOT EXISTS lokasi_lapak VARCHAR(255);

-- 4. Fungsi pembantu: convert timestamptz -> tanggal (WIB), ditandai
--    IMMUTABLE secara eksplisit. Aman karena zona 'Asia/Jakarta' selalu
--    fixed, gak pernah gantung ke setting session manapun.
CREATE OR REPLACE FUNCTION tanggal_wib(ts TIMESTAMPTZ)
RETURNS DATE AS $$
    SELECT (ts AT TIME ZONE 'Asia/Jakarta')::date;
$$ LANGUAGE SQL IMMUTABLE;

-- 5. Index untuk performa query
CREATE INDEX IF NOT EXISTS idx_kehadiran_check_out_at ON kehadiran_pedagang(check_out_at);
CREATE INDEX IF NOT EXISTS idx_kehadiran_tanggal ON kehadiran_pedagang(tanggal_wib(check_in_at));