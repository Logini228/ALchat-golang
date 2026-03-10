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
    id SERIAL PRIMARY KEY,
    chatid TEXT NOT NULL,
    sender TEXT NOT NULL,
    message TEXT NOT NULL
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