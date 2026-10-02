import { z } from 'zod';

const DEV_INSECURE_SECRET = 'insecure-development-secret-do-not-use-in-production';

const booleanString = z
  .enum(['true', 'false'])
  .default('false')
  .transform((v) => v === 'true');

const EnvSchema = z.object({
  APP_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3100),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  DATABASE_URL: z.string().min(1),
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(100).default(10),
  REDIS_URL: z.string().min(1),
  SMTP_URL: z.string().optional(),
  EMAIL_FROM: z.string().default('MAWJOOd <no-reply@mawjood.local>'),
  APP_SECRET: z.string().optional(),
  JWT_PRIVATE_KEY: z.string().optional(),
  JWT_PUBLIC_KEY: z.string().optional(),
  CORS_ORIGINS: z.string().default(''),
  TRUST_PROXY: booleanString,
  DEFAULT_TIMEZONE: z.string().default('Africa/Casablanca'),
  DEFAULT_CURRENCY: z
    .string()
    .regex(/^[A-Z]{3}$/)
    .default('MAD'),
  MAX_ACTIVE_RESERVATIONS: z.coerce.number().int().min(1).max(20).default(3),
});

export type AppEnv = z.infer<typeof EnvSchema>['APP_ENV'];

export type AppConfig = {
  appEnv: AppEnv;
  port: number;
  logLevel: z.infer<typeof EnvSchema>['LOG_LEVEL'];
  databaseUrl: string;
  databasePoolMax: number;
  redisUrl: string;
  /** Optional key prefix so several apps (or test files) can share one Redis. */
  redisKeyPrefix: string;
  smtpUrl: string | null;
  emailFrom: string;
  appSecret: string;
  jwt: { privateKeyPem: string | null; publicKeyPem: string | null };
  corsOrigins: string[];
  trustProxy: boolean;
  defaultTimezone: string;
  defaultCurrency: string;
  maxActiveReservations: number;
};

/**
 * Parses and validates environment variables. Fails fast (throws) on any invalid or missing
 * value, and refuses insecure defaults outside development and test.
 */
export function loadConfig(env: NodeJS.ProcessEnv): AppConfig {
  const parsed = EnvSchema.safeParse(env);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid environment configuration: ${fields}`);
  }
  const e = parsed.data;
  const strict = e.APP_ENV === 'staging' || e.APP_ENV === 'production';

  if (strict) {
    const problems: string[] = [];
    if (!e.APP_SECRET || e.APP_SECRET.length < 32) problems.push('APP_SECRET (>= 32 chars)');
    if (!e.JWT_PRIVATE_KEY || !e.JWT_PUBLIC_KEY) problems.push('JWT_PRIVATE_KEY / JWT_PUBLIC_KEY');
    if (!e.SMTP_URL) problems.push('SMTP_URL');
    if (problems.length > 0) {
      throw new Error(`Missing required configuration for ${e.APP_ENV}: ${problems.join(', ')}`);
    }
  }

  return {
    appEnv: e.APP_ENV,
    port: e.PORT,
    logLevel: e.LOG_LEVEL,
    databaseUrl: e.DATABASE_URL,
    databasePoolMax: e.DATABASE_POOL_MAX,
    redisUrl: e.REDIS_URL,
    redisKeyPrefix: 'mawjood:',
    smtpUrl: e.SMTP_URL ?? null,
    emailFrom: e.EMAIL_FROM,
    appSecret: e.APP_SECRET && e.APP_SECRET.length > 0 ? e.APP_SECRET : DEV_INSECURE_SECRET,
    jwt: { privateKeyPem: e.JWT_PRIVATE_KEY ?? null, publicKeyPem: e.JWT_PUBLIC_KEY ?? null },
    corsOrigins: e.CORS_ORIGINS.split(',')
      .map((o) => o.trim())
      .filter((o) => o.length > 0),
    trustProxy: e.TRUST_PROXY,
    defaultTimezone: e.DEFAULT_TIMEZONE,
    defaultCurrency: e.DEFAULT_CURRENCY,
    maxActiveReservations: e.MAX_ACTIVE_RESERVATIONS,
  };
}

/** Injection token for the validated configuration object. */
export const APP_CONFIG = Symbol('APP_CONFIG');
