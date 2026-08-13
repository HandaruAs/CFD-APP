CREATE TABLE pedagang_profiles (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    nik                 VARCHAR(16) NOT NULL,
    nama_usaha          VARCHAR(150) NOT NULL,
    jenis_dagangan      VARCHAR(100) NOT NULL,
    alamat              TEXT NOT NULL,
    status_verifikasi   verification_status NOT NULL DEFAULT 'pending',
    catatan             TEXT,
    verified_by         UUID REFERENCES users(id) ON DELETE SET NULL,
    verified_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at          TIMESTAMPTZ
);

CREATE UNIQUE INDEX idx_pedagang_nik_active ON pedagang_profiles (nik) WHERE deleted_at IS NULL;
CREATE INDEX idx_pedagang_status_verifikasi ON pedagang_profiles(status_verifikasi);
