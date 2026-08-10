-- Password jadi nullable: pedagang yang daftar via Google OAuth
-- tidak akan pernah punya password di sistem kita
ALTER TABLE users ALTER COLUMN password DROP NOT NULL;

CREATE TABLE user_oauth_accounts (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider          VARCHAR(50) NOT NULL,        -- 'google', nanti bisa provider lain
    provider_user_id  VARCHAR(255) NOT NULL,       -- 'sub' claim dari Google
    email             VARCHAR(255),                -- email dari provider (buat referensi)
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at        TIMESTAMPTZ
);

CREATE UNIQUE INDEX idx_user_oauth_provider_account_active
    ON user_oauth_accounts (provider, provider_user_id) WHERE deleted_at IS NULL;
