-- schema.sql
-- psql -h 127.0.0.1 -U postgresuser -d postgresdb -f schema.sql

CREATE IF NOT EXISTS SCHEMA chat_app;

SET search_path TO chat_app;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS db_version_history (
    id SERIAL PRIMARY KEY,
    version TEXT NOT NULL, -- Format 'X.Y.Z'
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    description TEXT
);

CREATE TABLE IF NOT EXISTS users (
    uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    googleid TEXT UNIQUE,
    name TEXT,
    avatar TEXT,
    jtis TEXT[]
);

CREATE TABLE IF NOT EXISTS chat (
    chatid TEXT PRIMARY KEY,
    chatname TEXT DEFAULT 'chat',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_members (
    PRIMARY KEY (uuid, chatid),
    uuid UUID NOT NULL REFERENCES users(uuid) ON DELETE CASCADE,
    chatid TEXT NOT NULL REFERENCES chat(chatid) ON DELETE CASCADE,
    owner BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_members_user_uuid ON chat_members(uuid);

CREATE TABLE IF NOT EXISTS message (
    id SERIAL PRIMARY KEY,
    chatid TEXT NOT NULL REFERENCES chat(chatid) ON DELETE CASCADE,
    sender TEXT NOT NULL,
    sender_user BOOLEAN NOT NULL,
    message TEXT NOT NULL,
    mess_uuid UUID UNIQUE DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_message_chatid ON message(chatid);

CREATE TABLE IF NOT EXISTS models (
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

