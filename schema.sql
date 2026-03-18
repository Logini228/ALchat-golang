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

CREATE TABLE chat_sessions (
    chatid TEXT PRIMARY KEY,       -- The unique ID for the whole conversation
    chatname TEXT NOT NULL,        -- Change the name here, and it updates for everyone
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE chat_members (
    chatid TEXT REFERENCES chat_sessions(chatid) ON DELETE CASCADE,
    user_uuid UUID REFERENCES users(uuid) ON DELETE CASCADE,
    PRIMARY KEY (chatid, user_uuid)
);

CREATE TABLE chat (
    id SERIAL PRIMARY KEY,         -- Internal ID for ordering
    chatid TEXT REFERENCES chat_sessions(chatid) ON DELETE CASCADE,
    sender TEXT NOT NULL,          
    message TEXT NOT NULL,
    mess_uuid UUID UNIQUE DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

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