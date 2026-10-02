import { BoundingBox, DietaryTag, IsoDateTime, OfferSort } from '@mawjood/contracts';
import { z } from 'zod';

/** Query strings arrive as text: coerce, then validate with the same rules as the contracts. */
const latitude = z.coerce.number().min(-90).max(90);
const longitude = z.coerce.number().min(-180).max(180);

/** Comma-separated list, each item validated with `item`. */
const csv = <T extends z.ZodType>(item: T) =>
  z
    .string()
    .max(2_000)
    .transform((s, ctx) => {
      const parts = s.split(',').filter((part) => part.length > 0);
      const result = z.array(item).max(20).safeParse(parts);
      if (!result.success) {
        ctx.addIssue({ code: 'custom', message: 'Invalid list' });
        return z.NEVER;
      }
      return result.data;
    });

/** `minLng,minLat,maxLng,maxLat` (the order the mobile client sends). */
const bbox = z
  .string()
  .max(200)
  .transform((s, ctx) => {
    const n = s.split(',').map(Number);
    const result = BoundingBox.safeParse(
      n.length === 4 ? { minLng: n[0], minLat: n[1], maxLng: n[2], maxLat: n[3] } : null,
    );
    if (!result.success) {
      ctx.addIssue({ code: 'custom', message: 'Invalid bbox' });
      return z.NEVER;
    }
    return result.data;
  });

const booleanFlag = z.enum(['true', 'false']).transform((v) => v === 'true');

const pointRule = (q: { lat?: number; lng?: number }) =>
  (q.lat === undefined) === (q.lng === undefined);

/** Optional caller position (`lat` and `lng` together or not at all). */
export const PointQuery = z
  .strictObject({ lat: latitude.optional(), lng: longitude.optional() })
  .refine(pointRule, { message: 'lat and lng go together', path: ['lng'] });
export type PointQuery = z.infer<typeof PointQuery>;

export const RequiredPointQuery = z.strictObject({ lat: latitude, lng: longitude });
export type RequiredPointQuery = z.infer<typeof RequiredPointQuery>;

export const OffersQueryParams = z
  .strictObject({
    lat: latitude.optional(),
    lng: longitude.optional(),
    radiusM: z.coerce.number().int().min(100).max(50_000).optional(),
    bbox: bbox.optional(),
    categoryIds: csv(z.uuid()).optional(),
    dietary: csv(DietaryTag).optional(),
    maxPriceMinor: z.coerce.number().int().positive().optional(),
    pickupFrom: IsoDateTime.optional(),
    pickupTo: IsoDateTime.optional(),
    availableOnly: booleanFlag.optional(),
    minRating: z.coerce.number().min(1).max(5).optional(),
    sort: OfferSort.default('relevance'),
    cursor: z.string().max(1_000).optional(),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  })
  .refine(pointRule, { message: 'lat and lng go together', path: ['lng'] })
  .refine((q) => q.lat !== undefined || q.bbox !== undefined, {
    message: 'Either lat/lng or bbox is required',
    path: ['lat'],
  });
export type OffersQueryParams = z.infer<typeof OffersQueryParams>;

export const SearchQuery = z
  .strictObject({
    q: z.string().trim().min(2).max(60),
    lat: latitude.optional(),
    lng: longitude.optional(),
  })
  .refine(pointRule, { message: 'lat and lng go together', path: ['lng'] });
export type SearchQuery = z.infer<typeof SearchQuery>;

export const pointOf = (q: { lat?: number; lng?: number }) =>
  q.lat !== undefined && q.lng !== undefined ? { lat: q.lat, lng: q.lng } : null;
