CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE user_status AS ENUM ('active', 'suspended', 'banned');
CREATE TYPE verification_status AS ENUM ('pending', 'approved', 'rejected');
