DROP TABLE IF EXISTS user_oauth_accounts;

-- CATATAN: ini cuma aman dijalanin kalau belum ada user OAuth-only
-- (password NULL) di database, kalau ada, ALTER ini bakal gagal
ALTER TABLE users ALTER COLUMN password SET NOT NULL;
