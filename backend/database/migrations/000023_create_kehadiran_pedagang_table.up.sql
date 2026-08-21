-- 1. Tambah permission untuk scan QR
INSERT INTO permissions (id, name, slug, description, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'Scan QR pedagang',
    'pedagang.scan',
    'Memindai QR code dan mencatat kehadiran pedagang',
    now(),
    now()
) ON CONFLICT (slug) WHERE deleted_at IS NULL DO NOTHING;

-- 2. Assign permission ke role petugas
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.slug = 'petugas' 
  AND r.deleted_at IS NULL
  AND p.slug = 'pedagang.scan'
  AND p.deleted_at IS NULL
ON CONFLICT (role_id, permission_id) WHERE deleted_at IS NULL DO NOTHING;

-- 3. Tabel kehadiran pedagang
CREATE TABLE IF NOT EXISTS kehadiran_pedagang (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pedagang_id     UUID NOT NULL REFERENCES pedagang_profiles(id) ON DELETE CASCADE,
    session_id      UUID NOT NULL REFERENCES cfd_sessions(id) ON DELETE CASCADE,
    check_in_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    scanned_by      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    catatan         TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ
);

CREATE UNIQUE INDEX idx_kehadiran_pedagang_sesi 
    ON kehadiran_pedagang (pedagang_id, session_id) 
    WHERE deleted_at IS NULL;

CREATE INDEX idx_kehadiran_session ON kehadiran_pedagang(session_id);
CREATE INDEX idx_kehadiran_pedagang ON kehadiran_pedagang(pedagang_id);
CREATE INDEX idx_kehadiran_scanned_by ON kehadiran_pedagang(scanned_by);
CREATE INDEX idx_kehadiran_check_in_at ON kehadiran_pedagang(check_in_at);