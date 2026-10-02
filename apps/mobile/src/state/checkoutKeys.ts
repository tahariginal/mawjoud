import * as SecureStore from 'expo-secure-store';

import { newUuid } from '@/lib/ids';

const STORAGE_KEY = 'mawjood.checkoutAttempt';
/** Matches the server hold duration; after it, a new attempt gets a new key. */
const ATTEMPT_TTL_MS = 10 * 60_000;

type Attempt = { offerId: string; quantity: number; key: string; createdAt: number };

/**
 * Idempotency key for a checkout attempt, persisted BEFORE the request is sent so that a retry
 * after a crash, timeout or double tap reuses the same key (docs ADR-005).
 */
export async function checkoutKeyFor(offerId: string, quantity: number): Promise<string> {
  const now = Date.now();
  try {
    const raw = await SecureStore.getItemAsync(STORAGE_KEY);
    const previous = raw ? (JSON.parse(raw) as Attempt) : null;
    if (
      previous &&
      previous.offerId === offerId &&
      previous.quantity === quantity &&
      now - previous.createdAt < ATTEMPT_TTL_MS
    ) {
      return previous.key;
    }
  } catch {
    // Corrupt or unreadable entry: fall through and create a new attempt.
  }
  const attempt: Attempt = { offerId, quantity, key: newUuid(), createdAt: now };
  await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(attempt));
  return attempt.key;
}

/** Called once the order is known (success or definitive failure). */
export async function clearCheckoutAttempt(): Promise<void> {
  await SecureStore.deleteItemAsync(STORAGE_KEY);
}
