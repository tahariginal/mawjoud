import { sql } from 'kysely';

import type { AnyDb } from '../db.ts';

/** Businesses, members, locations (PostGIS), hours, offers and their inventory row. */
const up = [
  `CREATE TABLE businesses (
     id uuid PRIMARY KEY DEFAULT uuidv7(),
     name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 80),
     legal_name text NOT NULL CHECK (char_length(legal_name) BETWEEN 2 AND 120),
     category_id uuid NOT NULL REFERENCES categories (id),
     description text CHECK (char_length(description) <= 500),
     contact_email citext NOT NULL,
     phone text NOT NULL,
     status text NOT NULL DEFAULT 'PENDING_REVIEW'
       CHECK (status IN ('PENDING_REVIEW', 'ACTIVE', 'SUSPENDED', 'REJECTED')),
     rating_sum integer NOT NULL DEFAULT 0 CHECK (rating_sum >= 0),
     rating_count integer NOT NULL DEFAULT 0 CHECK (rating_count >= 0),
     created_at timestamptz NOT NULL DEFAULT now(),
     updated_at timestamptz NOT NULL DEFAULT now()
   )`,
  `CREATE TRIGGER businesses_set_updated_at BEFORE UPDATE ON businesses
     FOR EACH ROW EXECUTE FUNCTION set_updated_at()`,
  `CREATE INDEX businesses_created_idx ON businesses (created_at DESC) WHERE status = 'ACTIVE'`,

  `CREATE TABLE business_members (
     business_id uuid NOT NULL REFERENCES businesses (id) ON DELETE CASCADE,
     user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
     role text NOT NULL CHECK (role IN ('OWNER', 'STAFF')),
     created_at timestamptz NOT NULL DEFAULT now(),
     PRIMARY KEY (business_id, user_id)
   )`,
  `CREATE INDEX business_members_user_idx ON business_members (user_id)`,

  `CREATE TABLE business_locations (
     id uuid PRIMARY KEY DEFAULT uuidv7(),
     business_id uuid NOT NULL REFERENCES businesses (id) ON DELETE CASCADE,
     name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 80),
     address_line text NOT NULL CHECK (char_length(address_line) BETWEEN 3 AND 160),
     city text NOT NULL CHECK (char_length(city) BETWEEN 2 AND 80),
     postal_code text,
     country_code char(2) NOT NULL DEFAULT 'MA',
     geog geography(Point, 4326) NOT NULL,
     timezone text NOT NULL,
     phone text,
     created_at timestamptz NOT NULL DEFAULT now(),
     updated_at timestamptz NOT NULL DEFAULT now()
   )`,
  `CREATE TRIGGER business_locations_set_updated_at BEFORE UPDATE ON business_locations
     FOR EACH ROW EXECUTE FUNCTION set_updated_at()`,
  `CREATE INDEX business_locations_geog_idx ON business_locations USING gist (geog)`,
  `CREATE INDEX business_locations_business_idx ON business_locations (business_id)`,
  `CREATE INDEX business_locations_name_trgm_idx ON business_locations USING gin (lower(name) gin_trgm_ops)`,

  `CREATE TABLE business_hours (
     location_id uuid NOT NULL REFERENCES business_locations (id) ON DELETE CASCADE,
     weekday smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
     opens_at time NOT NULL,
     closes_at time NOT NULL,
     CONSTRAINT business_hours_not_empty CHECK (opens_at <> closes_at),
     PRIMARY KEY (location_id, weekday)
   )`,

  `CREATE TABLE offers (
     id uuid PRIMARY KEY DEFAULT uuidv7(),
     business_id uuid NOT NULL REFERENCES businesses (id),
     location_id uuid NOT NULL REFERENCES business_locations (id),
     category_id uuid NOT NULL REFERENCES categories (id),
     title text NOT NULL CHECK (char_length(title) BETWEEN 3 AND 80),
     description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 500),
     contents_note text CHECK (char_length(contents_note) <= 200),
     price_minor bigint NOT NULL CHECK (price_minor > 0),
     reference_value_minor bigint
       CHECK (reference_value_minor IS NULL OR reference_value_minor > price_minor),
     currency char(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
     pickup_start timestamptz NOT NULL,
     pickup_end timestamptz NOT NULL,
     max_per_order smallint NOT NULL CHECK (max_per_order BETWEEN 1 AND 20),
     status text NOT NULL DEFAULT 'ACTIVE'
       CHECK (status IN ('DRAFT', 'ACTIVE', 'PAUSED', 'ENDED', 'REMOVED')),
     allergens text[] NOT NULL DEFAULT '{}',
     dietary_tags text[] NOT NULL DEFAULT '{}',
     geog geography(Point, 4326) NOT NULL,
     version integer NOT NULL DEFAULT 0,
     created_at timestamptz NOT NULL DEFAULT now(),
     updated_at timestamptz NOT NULL DEFAULT now(),
     CONSTRAINT offers_pickup_window CHECK (pickup_end > pickup_start)
   )`,
  `CREATE TRIGGER offers_set_updated_at BEFORE UPDATE ON offers
     FOR EACH ROW EXECUTE FUNCTION set_updated_at()`,
  `CREATE INDEX offers_geog_active_idx ON offers USING gist (geog) WHERE status = 'ACTIVE'`,
  `CREATE INDEX offers_location_idx ON offers (location_id, pickup_start)`,
  `CREATE INDEX offers_business_idx ON offers (business_id, status)`,
  `CREATE INDEX offers_open_pickup_end_idx ON offers (pickup_end) WHERE status IN ('ACTIVE', 'PAUSED')`,
  `CREATE INDEX offers_title_trgm_idx ON offers USING gin (lower(title) gin_trgm_ops)`,

  // Stock lives in its own row (ADR-009): reservations update only this narrow row.
  `CREATE TABLE offer_inventory (
     offer_id uuid PRIMARY KEY REFERENCES offers (id) ON DELETE CASCADE,
     quantity_total integer NOT NULL CHECK (quantity_total >= 0),
     quantity_available integer NOT NULL,
     updated_at timestamptz NOT NULL DEFAULT now(),
     CONSTRAINT offer_inventory_bounds
       CHECK (quantity_available >= 0 AND quantity_available <= quantity_total)
   )`,
];

const down = [
  `DROP TABLE offer_inventory`,
  `DROP TABLE offers`,
  `DROP TABLE business_hours`,
  `DROP TABLE business_locations`,
  `DROP TABLE business_members`,
  `DROP TABLE businesses`,
];

export async function migrateUp(db: AnyDb): Promise<void> {
  for (const statement of up) await sql.raw(statement).execute(db);
}

export async function migrateDown(db: AnyDb): Promise<void> {
  for (const statement of down) await sql.raw(statement).execute(db);
}
