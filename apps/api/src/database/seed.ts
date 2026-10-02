import type { Db } from './db.ts';

/**
 * Development seed data. Filled in as features land (merchants, offers, demo users).
 * The CLI refuses to run this outside APP_ENV=development.
 */
export async function seedDevelopmentData(_db: Db): Promise<void> {
  // Categories are reference data created by migration 0001.
}
