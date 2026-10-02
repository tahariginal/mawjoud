import { sql } from 'kysely';

import type { AnyDb } from '../db.ts';

/** Favorites, orders (reservations), idempotency, pickups and reviews. */
const ORDER_STATUSES = `'CREATED', 'PAYMENT_PENDING', 'CONFIRMED', 'READY_FOR_PICKUP', 'PICKED_UP',
  'CANCELLED', 'EXPIRED', 'FAILED', 'NO_SHOW'`;
const ACTORS = `'CUSTOMER', 'MERCHANT', 'ADMIN', 'SYSTEM'`;

const up = [
  `CREATE TABLE favorites (
     user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
     location_id uuid NOT NULL REFERENCES business_locations (id) ON DELETE CASCADE,
     created_at timestamptz NOT NULL DEFAULT now(),
     PRIMARY KEY (user_id, location_id)
   )`,
  `CREATE INDEX favorites_location_idx ON favorites (location_id)`,

  `CREATE TABLE orders (
     id uuid PRIMARY KEY DEFAULT uuidv7(),
     short_code text NOT NULL UNIQUE,
     user_id uuid NOT NULL REFERENCES users (id),
     business_id uuid NOT NULL REFERENCES businesses (id),
     location_id uuid NOT NULL REFERENCES business_locations (id),
     status text NOT NULL CHECK (status IN (${ORDER_STATUSES})),
     payment_method text NOT NULL DEFAULT 'PAY_AT_PICKUP' CHECK (payment_method IN ('PAY_AT_PICKUP')),
     subtotal_minor bigint NOT NULL CHECK (subtotal_minor >= 0),
     fees_minor bigint NOT NULL DEFAULT 0 CHECK (fees_minor >= 0),
     discount_minor bigint NOT NULL DEFAULT 0 CHECK (discount_minor >= 0),
     tax_minor bigint NOT NULL DEFAULT 0 CHECK (tax_minor >= 0),
     total_minor bigint NOT NULL CHECK (total_minor >= 0),
     currency char(3) NOT NULL,
     pickup_start timestamptz NOT NULL,
     pickup_end timestamptz NOT NULL,
     pickup_timezone text NOT NULL,
     pickup_code text NOT NULL CHECK (pickup_code ~ '^[A-Z0-9]{6}$'),
     picked_up_at timestamptz,
     cancelled_at timestamptz,
     cancelled_reason text CHECK (char_length(cancelled_reason) <= 300),
     cancelled_by text CHECK (cancelled_by IN (${ACTORS})),
     created_at timestamptz NOT NULL DEFAULT now(),
     updated_at timestamptz NOT NULL DEFAULT now(),
     CONSTRAINT orders_total_consistency
       CHECK (total_minor = subtotal_minor + fees_minor + tax_minor - discount_minor),
     CONSTRAINT orders_pickup_consistency CHECK ((status = 'PICKED_UP') = (picked_up_at IS NOT NULL)),
     CONSTRAINT orders_cancel_consistency CHECK ((status = 'CANCELLED') = (cancelled_at IS NOT NULL))
   )`,
  `CREATE TRIGGER orders_set_updated_at BEFORE UPDATE ON orders
     FOR EACH ROW EXECUTE FUNCTION set_updated_at()`,
  // A short code identifies one open order per store (ADR-012).
  `CREATE UNIQUE INDEX orders_open_pickup_code_uq ON orders (location_id, pickup_code)
     WHERE status IN ('CONFIRMED', 'READY_FOR_PICKUP')`,
  `CREATE INDEX orders_user_idx ON orders (user_id, created_at DESC, id)`,
  `CREATE INDEX orders_location_open_idx ON orders (location_id, pickup_start)
     WHERE status IN ('CONFIRMED', 'READY_FOR_PICKUP')`,
  `CREATE INDEX orders_open_pickup_end_idx ON orders (pickup_end)
     WHERE status IN ('CONFIRMED', 'READY_FOR_PICKUP')`,

  `CREATE TABLE order_items (
     id uuid PRIMARY KEY DEFAULT uuidv7(),
     order_id uuid NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
     offer_id uuid NOT NULL REFERENCES offers (id),
     title text NOT NULL,
     quantity integer NOT NULL CHECK (quantity > 0),
     unit_price_minor bigint NOT NULL CHECK (unit_price_minor > 0),
     reference_value_minor bigint,
     currency char(3) NOT NULL
   )`,
  `CREATE INDEX order_items_order_idx ON order_items (order_id)`,
  `CREATE INDEX order_items_offer_idx ON order_items (offer_id)`,

  `CREATE TABLE order_status_history (
     id uuid PRIMARY KEY DEFAULT uuidv7(),
     order_id uuid NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
     from_status text CHECK (from_status IN (${ORDER_STATUSES})),
     to_status text NOT NULL CHECK (to_status IN (${ORDER_STATUSES})),
     actor_type text NOT NULL CHECK (actor_type IN (${ACTORS})),
     actor_id uuid,
     reason text,
     created_at timestamptz NOT NULL DEFAULT now()
   )`,
  `CREATE INDEX order_status_history_order_idx ON order_status_history (order_id, created_at)`,

  `CREATE TABLE idempotency_keys (
     user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
     endpoint text NOT NULL,
     key text NOT NULL CHECK (char_length(key) BETWEEN 8 AND 100),
     request_hash bytea NOT NULL,
     status text NOT NULL CHECK (status IN ('IN_PROGRESS', 'COMPLETED')),
     locked_until timestamptz NOT NULL,
     response_status smallint,
     response_body jsonb,
     created_at timestamptz NOT NULL DEFAULT now(),
     expires_at timestamptz NOT NULL,
     PRIMARY KEY (user_id, endpoint, key)
   )`,
  `CREATE INDEX idempotency_keys_expiry_idx ON idempotency_keys (expires_at)`,

  // One successful pickup per order, enforced by the database (ADR-012).
  `CREATE TABLE pickups (
     id uuid PRIMARY KEY DEFAULT uuidv7(),
     order_id uuid NOT NULL UNIQUE REFERENCES orders (id),
     location_id uuid NOT NULL REFERENCES business_locations (id),
     validated_by uuid NOT NULL REFERENCES users (id),
     method text NOT NULL CHECK (method IN ('QR', 'CODE', 'MANUAL_OVERRIDE')),
     validated_at timestamptz NOT NULL DEFAULT now()
   )`,
  `CREATE TABLE pickup_attempts (
     id uuid PRIMARY KEY DEFAULT uuidv7(),
     location_id uuid REFERENCES business_locations (id) ON DELETE CASCADE,
     staff_user_id uuid REFERENCES users (id) ON DELETE SET NULL,
     result text NOT NULL,
     created_at timestamptz NOT NULL DEFAULT now()
   )`,
  `CREATE INDEX pickup_attempts_location_idx ON pickup_attempts (location_id, created_at DESC)`,

  `CREATE TABLE reviews (
     id uuid PRIMARY KEY DEFAULT uuidv7(),
     order_id uuid NOT NULL UNIQUE REFERENCES orders (id),
     user_id uuid NOT NULL REFERENCES users (id),
     business_id uuid NOT NULL REFERENCES businesses (id),
     rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
     comment text CHECK (char_length(comment) <= 500),
     status text NOT NULL DEFAULT 'PUBLISHED' CHECK (status IN ('PUBLISHED', 'HIDDEN')),
     created_at timestamptz NOT NULL DEFAULT now()
   )`,
];

const down = [
  `DROP TABLE reviews`,
  `DROP TABLE pickup_attempts`,
  `DROP TABLE pickups`,
  `DROP TABLE idempotency_keys`,
  `DROP TABLE order_status_history`,
  `DROP TABLE order_items`,
  `DROP TABLE orders`,
  `DROP TABLE favorites`,
];

export async function migrateUp(db: AnyDb): Promise<void> {
  for (const statement of up) await sql.raw(statement).execute(db);
}

export async function migrateDown(db: AnyDb): Promise<void> {
  for (const statement of down) await sql.raw(statement).execute(db);
}
