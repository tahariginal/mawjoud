import { sql } from 'kysely';

import type { AnyDb } from '../db.ts';

/** Extensions, identity (users, sessions, codes), platform config, audit log, categories. */
const up = [
  `CREATE EXTENSION IF NOT EXISTS citext`,
  `CREATE EXTENSION IF NOT EXISTS postgis`,
  `CREATE EXTENSION IF NOT EXISTS pg_trgm`,

  `CREATE FUNCTION set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
   BEGIN NEW.updated_at = now(); RETURN NEW; END $$`,

  `CREATE TABLE users (
     id uuid PRIMARY KEY DEFAULT uuidv7(),
     email citext NOT NULL UNIQUE,
     email_verified_at timestamptz,
     password_hash text,
     display_name text NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 60),
     locale text NOT NULL DEFAULT 'en' CHECK (locale IN ('en', 'fr', 'ar')),
     platform_role text NOT NULL DEFAULT 'CUSTOMER'
       CHECK (platform_role IN ('CUSTOMER', 'ADMIN', 'SUPER_ADMIN')),
     status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'DELETED')),
     notification_preferences jsonb,
     created_at timestamptz NOT NULL DEFAULT now(),
     updated_at timestamptz NOT NULL DEFAULT now(),
     deleted_at timestamptz,
     CONSTRAINT users_deleted_consistency CHECK ((status = 'DELETED') = (deleted_at IS NOT NULL))
   )`,
  `CREATE TRIGGER users_set_updated_at BEFORE UPDATE ON users
     FOR EACH ROW EXECUTE FUNCTION set_updated_at()`,

  `CREATE TABLE sessions (
     id uuid PRIMARY KEY DEFAULT uuidv7(),
     user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
     family_id uuid NOT NULL,
     secret_hash bytea NOT NULL,
     expires_at timestamptz NOT NULL,
     absolute_expires_at timestamptz NOT NULL,
     revoked_at timestamptz,
     replaced_by uuid,
     user_agent text,
     created_at timestamptz NOT NULL DEFAULT now(),
     CONSTRAINT sessions_expiry_order CHECK (expires_at <= absolute_expires_at)
   )`,
  `CREATE INDEX sessions_user_active_idx ON sessions (user_id) WHERE revoked_at IS NULL`,
  `CREATE INDEX sessions_family_idx ON sessions (family_id)`,

  `CREATE TABLE verification_codes (
     id uuid PRIMARY KEY DEFAULT uuidv7(),
     user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
     purpose text NOT NULL CHECK (purpose IN ('EMAIL_VERIFY', 'PASSWORD_RESET')),
     code_hash bytea NOT NULL,
     attempts smallint NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 5),
     expires_at timestamptz NOT NULL,
     consumed_at timestamptz,
     created_at timestamptz NOT NULL DEFAULT now()
   )`,
  `CREATE INDEX verification_codes_active_idx
     ON verification_codes (user_id, purpose, created_at DESC) WHERE consumed_at IS NULL`,

  `CREATE TABLE audit_logs (
     id uuid PRIMARY KEY DEFAULT uuidv7(),
     actor_user_id uuid REFERENCES users (id) ON DELETE SET NULL,
     action text NOT NULL,
     entity_type text NOT NULL,
     entity_id uuid,
     before jsonb,
     after jsonb,
     reason text,
     request_id text,
     created_at timestamptz NOT NULL DEFAULT now()
   )`,
  `CREATE INDEX audit_logs_entity_idx ON audit_logs (entity_type, entity_id, created_at DESC)`,

  `CREATE TABLE app_config (
     key text PRIMARY KEY,
     value jsonb NOT NULL,
     updated_at timestamptz NOT NULL DEFAULT now()
   )`,
  `CREATE TABLE feature_flags (
     key text PRIMARY KEY,
     enabled boolean NOT NULL DEFAULT false,
     updated_at timestamptz NOT NULL DEFAULT now()
   )`,

  `CREATE TABLE categories (
     id uuid PRIMARY KEY DEFAULT uuidv7(),
     slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]+$'),
     name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
     sort_order integer NOT NULL DEFAULT 0,
     active boolean NOT NULL DEFAULT true
   )`,
  // Reference data needed in every environment.
  `INSERT INTO categories (slug, name, sort_order) VALUES
     ('bakery', 'Bakery', 10),
     ('pastry', 'Pastry', 20),
     ('cafe', 'Café', 30),
     ('restaurant', 'Restaurant', 40),
     ('grocery', 'Grocery', 50)`,
  `INSERT INTO app_config (key, value) VALUES ('min_supported_version', '"0.0.0"')`,
];

const down = [
  `DROP TABLE categories`,
  `DROP TABLE feature_flags`,
  `DROP TABLE app_config`,
  `DROP TABLE audit_logs`,
  `DROP TABLE verification_codes`,
  `DROP TABLE sessions`,
  `DROP TABLE users`,
  `DROP FUNCTION set_updated_at()`,
];

export async function migrateUp(db: AnyDb): Promise<void> {
  for (const statement of up) await sql.raw(statement).execute(db);
}

export async function migrateDown(db: AnyDb): Promise<void> {
  for (const statement of down) await sql.raw(statement).execute(db);
}
