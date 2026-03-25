-- schema.sql
-- psql -h 127.0.0.1 -U postgresdb -d postgresdb -f schema.sql

DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

GRANT ALL ON SCHEMA public TO postgresdb;
GRANT ALL ON SCHEMA public TO public;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
    uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    googleid TEXT UNIQUE,
    name TEXT,
    avatar TEXT,
    jtis TEXT[]
);

CREATE TABLE chat (
    chatid TEXT PRIMARY KEY,
    chatname TEXT DEFAULT 'chat',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE chat_members (
    PRIMARY KEY (uuid, chatid),
    uuid UUID NOT NULL REFERENCES users(uuid) ON DELETE CASCADE,
    chatid TEXT NOT NULL REFERENCES chat(chatid) ON DELETE CASCADE,
    owner BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_members_user_uuid ON chat_members(uuid);

CREATE TABLE message (
    id SERIAL PRIMARY KEY,
    chatid TEXT NOT NULL REFERENCES chat(chatid) ON DELETE CASCADE,
    sender TEXT NOT NULL,
    message TEXT NOT NULL,
    mess_uuid UUID UNIQUE DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_message_chatid ON message(chatid);

CREATE TABLE models (
    aggregator TEXT NOT NULL,
    provider TEXT NOT NULL,
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price FLOAT[] NOT NULL,
    created BIGINT NOT NULL,
    context BIGINT,
    inputs TEXT[] NOT NULL,
    outputs TEXT[] NOT NULL,
    original JSONB NOT NULL DEFAULT '{}'
);