-- schema.sql
-- psql -h 127.0.0.1 -U postgres -d postgres -f schema.sql

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
    uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
);

CREATE TABLE chat (
    id SERIAL PRIMARY KEY,
    chatid TEXT NOT NULL,
    sender TEXT NOT NULL,
    message TEXT NOT NULL
);

-- Optional: add indexes
CREATE INDEX ON chat (chatid);