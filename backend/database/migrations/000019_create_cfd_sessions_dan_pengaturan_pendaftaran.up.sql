-- Tabel buat fitur "Jam Operasional" di halaman petugas:
--  - cfd_sessions: 1 baris per hari CFD (status sesi saat ini + riwayat)
--  - pengaturan_pendaftaran: settings global, cuma 1 baris, buka/tutup
--    akses pendaftaran pedagang + link websitenya

CREATE TYPE cfd_session_status AS ENUM (
    'berlangsung',
    'selesai_normal',
    'diperpanjang',
    'diakhiri_awal'
);

CREATE TABLE cfd_sessions (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tanggal              DATE NOT NULL,
    jam_mulai            TIME NOT NULL,
    jam_selesai_rencana  TIME NOT NULL,
    jam_selesai_aktual   TIME,
    status               cfd_session_status NOT NULL DEFAULT 'berlangsung',
    created_by           UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at           TIMESTAMPTZ
);

-- Cuma boleh ada 1 sesi aktif per tanggal
CREATE UNIQUE INDEX idx_cfd_sessions_tanggal_active ON cfd_sessions (tanggal) WHERE deleted_at IS NULL;
CREATE INDEX idx_cfd_sessions_status ON cfd_sessions(status) WHERE deleted_at IS NULL;

CREATE TABLE pengaturan_pendaftaran (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    is_open           BOOLEAN NOT NULL DEFAULT true,
    link_pendaftaran  VARCHAR(255),
    updated_by        UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Settings ini cuma butuh 1 baris (bukan per-tanggal kayak cfd_sessions),
-- jadi langsung seed baris awalnya di sini biar tabelnya gak pernah kosong.
INSERT INTO pengaturan_pendaftaran (is_open, link_pendaftaran)
VALUES (true, 'https://cfdsurabaya.id/pendaftaran');
