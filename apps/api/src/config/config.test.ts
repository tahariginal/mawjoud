import { describe, expect, it } from 'vitest';

import { loadConfig } from './config.ts';

const base = { DATABASE_URL: 'postgres://x', REDIS_URL: 'redis://x' };

describe('loadConfig', () => {
  it('applies safe defaults in development', () => {
    const c = loadConfig(base);
    expect(c.appEnv).toBe('development');
    expect(c.rateLimitsEnabled).toBe(true);
    expect(c.trustProxy).toBe(false);
    expect(c.maxActiveReservations).toBe(3);
  });

  it('fails fast on invalid values', () => {
    expect(() => loadConfig({ ...base, PORT: 'abc' })).toThrow(/Invalid environment/);
    expect(() => loadConfig({ REDIS_URL: 'redis://x' })).toThrow(/DATABASE_URL/);
  });

  it('refuses insecure production configuration', () => {
    expect(() => loadConfig({ ...base, APP_ENV: 'production' })).toThrow(/APP_SECRET/);
    expect(() =>
      loadConfig({
        ...base,
        APP_ENV: 'production',
        APP_SECRET: 'x'.repeat(40),
        JWT_PRIVATE_KEY: 'k',
        JWT_PUBLIC_KEY: 'k',
        SMTP_URL: 'smtp://x',
        RATE_LIMITS_ENABLED: 'false',
      }),
    ).toThrow(/RATE_LIMITS_ENABLED/);
  });

  it('parses booleans strictly (no "false" == true surprise)', () => {
    expect(loadConfig({ ...base, TRUST_PROXY: 'false' }).trustProxy).toBe(false);
    expect(loadConfig({ ...base, TRUST_PROXY: 'true' }).trustProxy).toBe(true);
    expect(() => loadConfig({ ...base, TRUST_PROXY: 'yes' })).toThrow();
  });
});
