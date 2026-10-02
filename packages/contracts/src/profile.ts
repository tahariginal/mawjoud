import { z } from 'zod';

import { Money, TimeOfDay } from './common.ts';
import { NotificationType } from './enums.ts';

export const ChannelPreference = z.object({
  push: z.boolean(),
  email: z.boolean(),
});
export type ChannelPreference = z.infer<typeof ChannelPreference>;

export const NotificationPreferences = z.object({
  types: z.record(NotificationType, ChannelPreference),
  quietHours: z.object({ enabled: z.boolean(), start: TimeOfDay, end: TimeOfDay }),
  maxFavoriteAlertsPerDay: z.number().int().min(0).max(10),
});
export type NotificationPreferences = z.infer<typeof NotificationPreferences>;

/**
 * Impact totals. `co2eKg` is null until sourced impact factors are configured
 * (open decision D8) — the UI must not invent a number.
 */
export const ImpactSummary = z.object({
  ordersCompleted: z.number().int().nonnegative(),
  itemsRescued: z.number().int().nonnegative(),
  moneySaved: Money,
  co2eKg: z.number().nonnegative().nullable(),
  methodology: z.object({ version: z.string(), url: z.url() }).nullable(),
});
export type ImpactSummary = z.infer<typeof ImpactSummary>;
