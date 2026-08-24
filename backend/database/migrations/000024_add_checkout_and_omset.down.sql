DROP INDEX IF EXISTS idx_kehadiran_tanggal;
DROP INDEX IF EXISTS idx_kehadiran_check_out_at;
DROP FUNCTION IF EXISTS tanggal_wib(TIMESTAMPTZ);
ALTER TABLE pedagang_profiles DROP COLUMN IF EXISTS lokasi_lapak;
ALTER TABLE kehadiran_pedagang DROP COLUMN IF EXISTS omset;
ALTER TABLE kehadiran_pedagang DROP COLUMN IF EXISTS check_out_at;