/**
 * DEMO ADAPTER — development only.
 * In-memory implementation of `MawjoodApi` so the app can be built and reviewed before the
 * backend exists. `src/config/env.ts` refuses to start a production build in this mode, and the
 * UI shows a "Demo data" badge whenever it is active.
 */
import { newUuid } from '@/lib/ids';

import type { MawjoodApi } from '../types';
import { createDemoCustomerApi } from './customer';
import { createDemoMerchantApi } from './merchant';
import { createDemoState, seedMerchantOrders } from './state';

export { DEMO_ONE_TIME_CODE } from './customer';
export { DEMO_SEEDED_PICKUP_CODES } from './fixtures';

type DemoOptions = {
  /** Simulated network latency, so loading states are visible. */
  latencyMs?: number;
  now?: () => number;
};

export function createDemoApi(options: DemoOptions = {}): MawjoodApi {
  const latencyMs = options.latencyMs ?? 350;
  const now = options.now ?? Date.now;
  const state = createDemoState(now());
  seedMerchantOrders(state, now(), () => newUuid().replace(/-/g, ''));

  const api = {
    ...createDemoCustomerApi(state, now),
    ...createDemoMerchantApi(state, now),
  };

  const withLatency =
    <A extends unknown[], R>(fn: (...args: A) => Promise<R>) =>
    async (...args: A): Promise<R> => {
      if (latencyMs > 0) await new Promise((resolve) => setTimeout(resolve, latencyMs));
      return fn(...args);
    };

  const wrapped = Object.fromEntries(
    Object.entries(api).map(([key, fn]) => [
      key,
      withLatency(fn as (...a: unknown[]) => Promise<unknown>),
    ]),
  ) as typeof api;

  return { mode: 'demo', ...wrapped };
}
