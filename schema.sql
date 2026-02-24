-- schema.sql
-- psql -h 127.0.0.1 -U postgres -d postgres -f schema.sql

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Users table
CREATE TABLE users (
    uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    googleid TEXT UNIQUE,
    name TEXT,
    avatar TEXT,
    jtis TEXT[]
);

-- Chat table
CREATE TABLE chat (
    id SERIAL PRIMARY KEY,
    chatid TEXT NOT NULL,
    sender TEXT NOT NULL,
    message TEXT NOT NULL
);

-- Models table (your new table)
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