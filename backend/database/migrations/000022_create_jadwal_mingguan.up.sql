-- Tabel jadwal_mingguan: template jadwal CFD yang berulang tiap minggu
-- (misal "tiap hari Minggu, 06:00 - 11:00"). Dipakai background job di
-- server buat OTOMATIS bikin baris cfd_sessions begitu jamnya tiba, dan
-- otomatis nutup sesi begitu jam_selesai_rencana lewat -- petugas nggak
-- perlu klik apa-apa kalau semuanya berjalan normal sesuai jadwal.
--
-- Dipisah dari cfd_sessions karena beda konsep: cfd_sessions = kejadian
-- aktual di 1 tanggal tertentu (bisa direvisi manual), jadwal_mingguan =
-- rencana yang berulang tiap minggu (template-nya).

CREATE TYPE hari_enum AS ENUM (
    'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu', 'minggu'
);

CREATE TABLE jadwal_mingguan (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hari                 hari_enum NOT NULL,
    jam_mulai            TIME NOT NULL,
    jam_selesai_rencana  TIME NOT NULL,
    is_active            BOOLEAN NOT NULL DEFAULT true,
    updated_by           UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Cuma boleh ada 1 baris jadwal per hari (nggak masuk akal ada 2 jadwal
-- beda buat hari Minggu yang sama).
CREATE UNIQUE INDEX idx_jadwal_mingguan_hari ON jadwal_mingguan (hari);

-- Seed default: CFD Surabaya rutin hari Minggu 06:00-11:00 (sesuai data
-- riwayat yang ada di mockup frontend -- semua tanggalnya hari Minggu).
INSERT INTO jadwal_mingguan (hari, jam_mulai, jam_selesai_rencana, is_active)
VALUES ('minggu', '06:00', '11:00', true);
