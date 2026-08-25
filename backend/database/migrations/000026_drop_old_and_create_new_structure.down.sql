-- Hapus index
DROP INDEX IF EXISTS idx_cfd_sessions_tanggal;
DROP INDEX IF EXISTS idx_cfd_sessions_status;
DROP INDEX IF EXISTS idx_cfd_sessions_active;
DROP INDEX IF EXISTS idx_master_instansi_nama;
DROP INDEX IF EXISTS idx_master_instansi_deleted;
DROP INDEX IF EXISTS idx_master_jalan_kode;
DROP INDEX IF EXISTS idx_master_jalan_nama;
DROP INDEX IF EXISTS idx_master_jalan_deleted;
DROP INDEX IF EXISTS idx_jalan_instansi_jalan;
DROP INDEX IF EXISTS idx_jalan_instansi_instansi;
DROP INDEX IF EXISTS idx_jalan_kapasitas_sesi_jalan;
DROP INDEX IF EXISTS idx_jalan_kapasitas_sesi_session;
DROP INDEX IF EXISTS idx_lapak_klaim_pedagang;
DROP INDEX IF EXISTS idx_lapak_klaim_session;
DROP INDEX IF EXISTS idx_lapak_klaim_jalan;

-- Hapus tabel baru
DROP TABLE IF EXISTS lapak_klaim CASCADE;
DROP TABLE IF EXISTS jalan_kapasitas_sesi CASCADE;
DROP TABLE IF EXISTS jalan_instansi CASCADE;
DROP TABLE IF EXISTS master_jalan CASCADE;
DROP TABLE IF EXISTS master_instansi CASCADE;
DROP TABLE IF EXISTS cfd_sessions CASCADE;

-- Kembalikan tabel lama (struktur kosong)
CREATE TABLE pedagang_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pedagang_id UUID,
    verification_status VARCHAR(50),
    catatan TEXT,
    verified_by UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE pengaturan_pedagang (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    is_open BOOLEAN DEFAULT false,
    link_pendaftaran VARCHAR(255),
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE user_oauth_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    provider VARCHAR(50),
    provider_user_id VARCHAR(255),
    email VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT now()
);