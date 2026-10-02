import { z } from 'zod';

export const Uuid = z.uuid();
export type Uuid = z.infer<typeof Uuid>;

/** ISO 8601 timestamp in UTC (e.g. `2026-10-02T17:00:00Z`). */
export const IsoDateTime = z.iso.datetime();
export type IsoDateTime = z.infer<typeof IsoDateTime>;

/** IANA timezone name (e.g. `Africa/Casablanca`). */
export const TimeZone = z.string().min(1).max(64);

export const CurrencyCode = z.string().regex(/^[A-Z]{3}$/, 'ISO 4217 code');
export type CurrencyCode = z.infer<typeof CurrencyCode>;

/** Money is always an integer amount of minor units (centimes for MAD). Never a float. */
export const Money = z.object({
  amountMinor: z.number().int().nonnegative(),
  currency: CurrencyCode,
});
export type Money = z.infer<typeof Money>;

export const GeoPoint = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});
export type GeoPoint = z.infer<typeof GeoPoint>;

export const BoundingBox = z
  .object({
    minLat: z.number().min(-90).max(90),
    minLng: z.number().min(-180).max(180),
    maxLat: z.number().min(-90).max(90),
    maxLng: z.number().min(-180).max(180),
  })
  .refine((b) => b.maxLat > b.minLat, { message: 'maxLat must be greater than minLat' });
export type BoundingBox = z.infer<typeof BoundingBox>;

/** Local time of day, `HH:MM` 24h. */
export const TimeOfDay = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'HH:MM');

export const ImageSet = z.object({
  thumbUrl: z.url(),
  mediumUrl: z.url(),
  largeUrl: z.url(),
  blurhash: z.string().nullable(),
});
export type ImageSet = z.infer<typeof ImageSet>;

export const PageInfo = z.object({
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
});
export type PageInfo = z.infer<typeof PageInfo>;

export const pageOf = <T extends z.ZodType>(item: T) =>
  z.object({
    data: z.array(item),
    page: PageInfo,
  });

export type Page<T> = { data: T[]; page: PageInfo };

export const PAGE_LIMIT_DEFAULT = 20;
export const PAGE_LIMIT_MAX = 50;
