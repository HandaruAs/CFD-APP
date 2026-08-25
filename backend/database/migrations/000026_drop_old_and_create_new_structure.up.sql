-- ==========================================
-- Hapus tabel lama (kecuali cfd_sessions karena akan dibuat ulang)
-- ==========================================
DROP TABLE IF EXISTS pedagang_verifications CASCADE;
DROP TABLE IF EXISTS pengaturan_pedagang CASCADE;
DROP TABLE IF EXISTS user_oauth_accounts CASCADE;

-- ==========================================
-- Buat ulang tabel cfd_sessions dengan struktur lengkap
-- ==========================================
CREATE TABLE cfd_sessions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_sesi   VARCHAR(100) NOT NULL,           -- "CFD Minggu 28 Agustus 2026"
    tanggal     DATE NOT NULL,                   -- Tanggal pelaksanaan
    jam_mulai   TIME,                            -- Waktu mulai
    jam_selesai TIME,                            -- Waktu selesai terjadwal
    jam_selesai_aktual TIME,                     -- Waktu selesai aktual (diisi petugas)
    status      VARCHAR(20) DEFAULT 'aktif',     -- aktif, ditutup, selesai, dibatalkan
    created_by  UUID,                            -- ID user yang membuat sesi
    is_active   BOOLEAN DEFAULT true,            -- Apakah sesi aktif untuk pendaftaran?
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at  TIMESTAMPTZ,
    
    CONSTRAINT chk_cfd_sessions_status CHECK (status IN ('aktif', 'ditutup', 'selesai', 'dibatalkan'))
);

-- 1. Master instansi
CREATE TABLE master_instansi (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_unit      VARCHAR(50)  NOT NULL,
    nama_instansi  VARCHAR(100) NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at     TIMESTAMPTZ
);

-- 2. Master jalan
CREATE TABLE master_jalan (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kode_jalan     VARCHAR(20)  NOT NULL UNIQUE,
    nama_jalan     VARCHAR(150) NOT NULL,
    kapasitas      INT NOT NULL CHECK (kapasitas > 0),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at     TIMESTAMPTZ
);

-- 3. Mapping jalan ke instansi
CREATE TABLE jalan_instansi (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    jalan_id     UUID NOT NULL REFERENCES master_jalan(id) ON DELETE CASCADE,
    instansi_id  UUID NOT NULL REFERENCES master_instansi(id) ON DELETE CASCADE,
    UNIQUE (jalan_id, instansi_id)
);

-- 4. Kapasitas terisi per sesi
CREATE TABLE jalan_kapasitas_sesi (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    jalan_id     UUID NOT NULL REFERENCES master_jalan(id) ON DELETE CASCADE,
    session_id   UUID NOT NULL REFERENCES cfd_sessions(id) ON DELETE CASCADE,
    terisi       INT NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (jalan_id, session_id)
);

-- 5. Histori klaim lapak
CREATE TABLE lapak_klaim (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pedagang_id  UUID NOT NULL REFERENCES pedagang_profiles(id) ON DELETE CASCADE,
    session_id   UUID NOT NULL REFERENCES cfd_sessions(id) ON DELETE CASCADE,
    jalan_id     UUID NOT NULL REFERENCES master_jalan(id) ON DELETE CASCADE,
    nomor_lapak  VARCHAR(20) NOT NULL,
    claimed_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (pedagang_id, session_id)
);

-- ==========================================
-- Index untuk optimasi
-- ==========================================
CREATE INDEX idx_cfd_sessions_tanggal ON cfd_sessions(tanggal);
CREATE INDEX idx_cfd_sessions_status ON cfd_sessions(status);
CREATE INDEX idx_cfd_sessions_active ON cfd_sessions(is_active);

CREATE INDEX idx_master_instansi_nama ON master_instansi(nama_instansi);
CREATE INDEX idx_master_instansi_deleted ON master_instansi(deleted_at);

CREATE INDEX idx_master_jalan_kode ON master_jalan(kode_jalan);
CREATE INDEX idx_master_jalan_nama ON master_jalan(nama_jalan);
CREATE INDEX idx_master_jalan_deleted ON master_jalan(deleted_at);

CREATE INDEX idx_jalan_instansi_jalan ON jalan_instansi(jalan_id);
CREATE INDEX idx_jalan_instansi_instansi ON jalan_instansi(instansi_id);

CREATE INDEX idx_jalan_kapasitas_sesi_jalan ON jalan_kapasitas_sesi(jalan_id);
CREATE INDEX idx_jalan_kapasitas_sesi_session ON jalan_kapasitas_sesi(session_id);

CREATE INDEX idx_lapak_klaim_pedagang ON lapak_klaim(pedagang_id);
CREATE INDEX idx_lapak_klaim_session ON lapak_klaim(session_id);
CREATE INDEX idx_lapak_klaim_jalan ON lapak_klaim(jalan_id);