import type { Migration } from 'kysely/migration';

import * as m0001 from './0001_foundation.ts';
import * as m0002 from './0002_merchants_offers.ts';
import * as m0003 from './0003_orders.ts';

const toMigration = (m: {
  migrateUp: Migration['up'];
  migrateDown: NonNullable<Migration['down']>;
}): Migration => ({ up: m.migrateUp, down: m.migrateDown });

/**
 * Ordered migrations. Names are permanent once applied anywhere — never rename or edit an
 * applied migration; add a new one (expand → migrate → contract, docs/DATABASE_DESIGN.md §6).
 */
export const migrations: Record<string, Migration> = {
  '0001_foundation': toMigration(m0001),
  '0002_merchants_offers': toMigration(m0002),
  '0003_orders': toMigration(m0003),
};
