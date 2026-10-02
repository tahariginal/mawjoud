import { z } from 'zod';

export const AppConfig = z.object({
  minSupportedVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
  flags: z.record(z.string(), z.boolean()),
  supportEmail: z.email().nullable(),
  legal: z.object({
    termsUrl: z.url().nullable(),
    privacyUrl: z.url().nullable(),
  }),
});
export type AppConfig = z.infer<typeof AppConfig>;
