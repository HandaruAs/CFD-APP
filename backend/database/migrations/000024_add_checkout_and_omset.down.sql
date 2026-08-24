-- ============================================================
-- ROLLBACK 000024
-- ============================================================

DROP INDEX IF EXISTS idx_kehadiran_check_out_at;
DROP INDEX IF EXISTS idx_kehadiran_tanggal;

ALTER TABLE kehadiran_pedagang 
DROP COLUMN IF EXISTS check_out_at,
DROP COLUMN IF EXISTS omset;

ALTER TABLE pedagang_profiles 
DROP COLUMN IF EXISTS lokasi_lapak;