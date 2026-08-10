CREATE TABLE pedagang_verifications (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pedagang_id UUID NOT NULL REFERENCES pedagang_profiles(id) ON DELETE CASCADE,
    status      verification_status NOT NULL,
    catatan     TEXT,
    verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at  TIMESTAMPTZ
);
