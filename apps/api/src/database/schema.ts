import type { ColumnType, Generated } from 'kysely';

/**
 * TypeScript view of the database schema (migrations are the source of truth).
 * `test/schema.test.ts` checks every table/column here against the migrated database.
 */

/** timestamptz: read as Date; written as Date or ISO string. */
type Timestamp = ColumnType<Date, Date | string, Date | string>;
type DefaultTimestamp = ColumnType<Date, Date | string | undefined, Date | string>;
/** Columns with a database default. */
type Default<T> = ColumnType<T, T | undefined, T>;
/** geography(Point) is only written through SQL expressions and never selected raw. */
type Geography = ColumnType<never, string, string>;
/** bigint money columns are parsed to number (safe-integer checked) in db.ts. */
type Bigint = ColumnType<number, number, number>;

export type UserTable = {
  id: Generated<string>;
  email: string;
  email_verified_at: Timestamp | null;
  password_hash: string | null;
  display_name: string;
  locale: Default<'en' | 'fr' | 'ar'>;
  platform_role: Default<'CUSTOMER' | 'ADMIN' | 'SUPER_ADMIN'>;
  status: Default<'ACTIVE' | 'SUSPENDED' | 'DELETED'>;
  notification_preferences: unknown | null;
  created_at: DefaultTimestamp;
  updated_at: DefaultTimestamp;
  deleted_at: Timestamp | null;
};

export type SessionTable = {
  id: Generated<string>;
  user_id: string;
  family_id: string;
  secret_hash: Buffer;
  expires_at: Timestamp;
  absolute_expires_at: Timestamp;
  revoked_at: Timestamp | null;
  replaced_by: string | null;
  user_agent: string | null;
  created_at: DefaultTimestamp;
};

export type VerificationCodeTable = {
  id: Generated<string>;
  user_id: string;
  purpose: 'EMAIL_VERIFY' | 'PASSWORD_RESET';
  code_hash: Buffer;
  attempts: Default<number>;
  expires_at: Timestamp;
  consumed_at: Timestamp | null;
  created_at: DefaultTimestamp;
};

export type AuditLogTable = {
  id: Generated<string>;
  actor_user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  before: unknown | null;
  after: unknown | null;
  reason: string | null;
  request_id: string | null;
  created_at: DefaultTimestamp;
};

export type AppConfigTable = { key: string; value: unknown; updated_at: DefaultTimestamp };
export type FeatureFlagTable = {
  key: string;
  enabled: Default<boolean>;
  updated_at: DefaultTimestamp;
};

export type CategoryTable = {
  id: Generated<string>;
  slug: string;
  name: string;
  sort_order: Default<number>;
  active: Default<boolean>;
};

export type BusinessStatus = 'PENDING_REVIEW' | 'ACTIVE' | 'SUSPENDED' | 'REJECTED';

export type BusinessTable = {
  id: Generated<string>;
  name: string;
  legal_name: string;
  category_id: string;
  description: string | null;
  contact_email: string;
  phone: string;
  status: Default<BusinessStatus>;
  rating_sum: Default<number>;
  rating_count: Default<number>;
  created_at: DefaultTimestamp;
  updated_at: DefaultTimestamp;
};

export type BusinessMemberTable = {
  business_id: string;
  user_id: string;
  role: 'OWNER' | 'STAFF';
  created_at: DefaultTimestamp;
};

export type BusinessLocationTable = {
  id: Generated<string>;
  business_id: string;
  name: string;
  address_line: string;
  city: string;
  postal_code: string | null;
  country_code: Default<string>;
  geog: Geography;
  timezone: string;
  phone: string | null;
  created_at: DefaultTimestamp;
  updated_at: DefaultTimestamp;
};

export type BusinessHoursTable = {
  location_id: string;
  weekday: number;
  /** `HH:MM:SS` as returned by PostgreSQL. */
  opens_at: string;
  closes_at: string;
};

export type OfferDbStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ENDED' | 'REMOVED';

export type OfferTable = {
  id: Generated<string>;
  business_id: string;
  location_id: string;
  category_id: string;
  title: string;
  description: Default<string>;
  contents_note: string | null;
  price_minor: Bigint;
  reference_value_minor: Bigint | null;
  currency: string;
  pickup_start: Timestamp;
  pickup_end: Timestamp;
  max_per_order: number;
  status: Default<OfferDbStatus>;
  allergens: Default<string[]>;
  dietary_tags: Default<string[]>;
  geog: Geography;
  version: Default<number>;
  created_at: DefaultTimestamp;
  updated_at: DefaultTimestamp;
};

export type OfferInventoryTable = {
  offer_id: string;
  quantity_total: number;
  quantity_available: number;
  updated_at: DefaultTimestamp;
};

export type FavoriteTable = { user_id: string; location_id: string; created_at: DefaultTimestamp };

export type OrderDbStatus =
  | 'CREATED'
  | 'PAYMENT_PENDING'
  | 'CONFIRMED'
  | 'READY_FOR_PICKUP'
  | 'PICKED_UP'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'FAILED'
  | 'NO_SHOW';

export type Actor = 'CUSTOMER' | 'MERCHANT' | 'ADMIN' | 'SYSTEM';

export type OrderTable = {
  id: Generated<string>;
  short_code: string;
  user_id: string;
  business_id: string;
  location_id: string;
  status: OrderDbStatus;
  payment_method: Default<'PAY_AT_PICKUP'>;
  subtotal_minor: Bigint;
  fees_minor: ColumnType<number, number | undefined, number>;
  discount_minor: ColumnType<number, number | undefined, number>;
  tax_minor: ColumnType<number, number | undefined, number>;
  total_minor: Bigint;
  currency: string;
  pickup_start: Timestamp;
  pickup_end: Timestamp;
  pickup_timezone: string;
  pickup_code: string;
  picked_up_at: Timestamp | null;
  cancelled_at: Timestamp | null;
  cancelled_reason: string | null;
  cancelled_by: Actor | null;
  created_at: DefaultTimestamp;
  updated_at: DefaultTimestamp;
};

export type OrderItemTable = {
  id: Generated<string>;
  order_id: string;
  offer_id: string;
  title: string;
  quantity: number;
  unit_price_minor: Bigint;
  reference_value_minor: Bigint | null;
  currency: string;
};

export type OrderStatusHistoryTable = {
  id: Generated<string>;
  order_id: string;
  from_status: OrderDbStatus | null;
  to_status: OrderDbStatus;
  actor_type: Actor;
  actor_id: string | null;
  reason: string | null;
  created_at: DefaultTimestamp;
};

export type IdempotencyKeyTable = {
  user_id: string;
  endpoint: string;
  key: string;
  request_hash: Buffer;
  status: 'IN_PROGRESS' | 'COMPLETED';
  locked_until: Timestamp;
  response_status: number | null;
  response_body: unknown | null;
  created_at: DefaultTimestamp;
  expires_at: Timestamp;
};

export type PickupTable = {
  id: Generated<string>;
  order_id: string;
  location_id: string;
  validated_by: string;
  method: 'QR' | 'CODE' | 'MANUAL_OVERRIDE';
  validated_at: DefaultTimestamp;
};

export type PickupAttemptTable = {
  id: Generated<string>;
  location_id: string | null;
  staff_user_id: string | null;
  result: string;
  created_at: DefaultTimestamp;
};

export type ReviewTable = {
  id: Generated<string>;
  order_id: string;
  user_id: string;
  business_id: string;
  rating: number;
  comment: string | null;
  status: Default<'PUBLISHED' | 'HIDDEN'>;
  created_at: DefaultTimestamp;
};

export type Database = {
  users: UserTable;
  sessions: SessionTable;
  verification_codes: VerificationCodeTable;
  audit_logs: AuditLogTable;
  app_config: AppConfigTable;
  feature_flags: FeatureFlagTable;
  categories: CategoryTable;
  businesses: BusinessTable;
  business_members: BusinessMemberTable;
  business_locations: BusinessLocationTable;
  business_hours: BusinessHoursTable;
  offers: OfferTable;
  offer_inventory: OfferInventoryTable;
  favorites: FavoriteTable;
  orders: OrderTable;
  order_items: OrderItemTable;
  order_status_history: OrderStatusHistoryTable;
  idempotency_keys: IdempotencyKeyTable;
  pickups: PickupTable;
  pickup_attempts: PickupAttemptTable;
  reviews: ReviewTable;
};

/** Column names per table, used by the schema drift test. */
export const SCHEMA_COLUMNS: { [T in keyof Database]: readonly (keyof Database[T])[] } = {
  users: [
    'id',
    'email',
    'email_verified_at',
    'password_hash',
    'display_name',
    'locale',
    'platform_role',
    'status',
    'notification_preferences',
    'created_at',
    'updated_at',
    'deleted_at',
  ],
  sessions: [
    'id',
    'user_id',
    'family_id',
    'secret_hash',
    'expires_at',
    'absolute_expires_at',
    'revoked_at',
    'replaced_by',
    'user_agent',
    'created_at',
  ],
  verification_codes: [
    'id',
    'user_id',
    'purpose',
    'code_hash',
    'attempts',
    'expires_at',
    'consumed_at',
    'created_at',
  ],
  audit_logs: [
    'id',
    'actor_user_id',
    'action',
    'entity_type',
    'entity_id',
    'before',
    'after',
    'reason',
    'request_id',
    'created_at',
  ],
  app_config: ['key', 'value', 'updated_at'],
  feature_flags: ['key', 'enabled', 'updated_at'],
  categories: ['id', 'slug', 'name', 'sort_order', 'active'],
  businesses: [
    'id',
    'name',
    'legal_name',
    'category_id',
    'description',
    'contact_email',
    'phone',
    'status',
    'rating_sum',
    'rating_count',
    'created_at',
    'updated_at',
  ],
  business_members: ['business_id', 'user_id', 'role', 'created_at'],
  business_locations: [
    'id',
    'business_id',
    'name',
    'address_line',
    'city',
    'postal_code',
    'country_code',
    'geog',
    'timezone',
    'phone',
    'created_at',
    'updated_at',
  ],
  business_hours: ['location_id', 'weekday', 'opens_at', 'closes_at'],
  offers: [
    'id',
    'business_id',
    'location_id',
    'category_id',
    'title',
    'description',
    'contents_note',
    'price_minor',
    'reference_value_minor',
    'currency',
    'pickup_start',
    'pickup_end',
    'max_per_order',
    'status',
    'allergens',
    'dietary_tags',
    'geog',
    'version',
    'created_at',
    'updated_at',
  ],
  offer_inventory: ['offer_id', 'quantity_total', 'quantity_available', 'updated_at'],
  favorites: ['user_id', 'location_id', 'created_at'],
  orders: [
    'id',
    'short_code',
    'user_id',
    'business_id',
    'location_id',
    'status',
    'payment_method',
    'subtotal_minor',
    'fees_minor',
    'discount_minor',
    'tax_minor',
    'total_minor',
    'currency',
    'pickup_start',
    'pickup_end',
    'pickup_timezone',
    'pickup_code',
    'picked_up_at',
    'cancelled_at',
    'cancelled_reason',
    'cancelled_by',
    'created_at',
    'updated_at',
  ],
  order_items: [
    'id',
    'order_id',
    'offer_id',
    'title',
    'quantity',
    'unit_price_minor',
    'reference_value_minor',
    'currency',
  ],
  order_status_history: [
    'id',
    'order_id',
    'from_status',
    'to_status',
    'actor_type',
    'actor_id',
    'reason',
    'created_at',
  ],
  idempotency_keys: [
    'user_id',
    'endpoint',
    'key',
    'request_hash',
    'status',
    'locked_until',
    'response_status',
    'response_body',
    'created_at',
    'expires_at',
  ],
  pickups: ['id', 'order_id', 'location_id', 'validated_by', 'method', 'validated_at'],
  pickup_attempts: ['id', 'location_id', 'staff_user_id', 'result', 'created_at'],
  reviews: [
    'id',
    'order_id',
    'user_id',
    'business_id',
    'rating',
    'comment',
    'status',
    'created_at',
  ],
};
