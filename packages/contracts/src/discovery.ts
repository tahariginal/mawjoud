import { z } from 'zod';

import {
  BoundingBox,
  GeoPoint,
  ImageSet,
  IsoDateTime,
  Money,
  PAGE_LIMIT_DEFAULT,
  PAGE_LIMIT_MAX,
  TimeOfDay,
  TimeZone,
  Uuid,
} from './common.ts';
import { Allergen, DietaryTag, OfferSort, OfferStatus } from './enums.ts';

export const Category = z.object({
  id: Uuid,
  slug: z.string(),
  name: z.string(),
});
export type Category = z.infer<typeof Category>;

export const Rating = z.object({
  average: z.number().min(1).max(5),
  count: z.number().int().positive(),
});
export type Rating = z.infer<typeof Rating>;

export const PickupWindow = z.object({
  start: IsoDateTime,
  end: IsoDateTime,
  timezone: TimeZone,
});
export type PickupWindow = z.infer<typeof PickupWindow>;

export const Address = z.object({
  line1: z.string(),
  city: z.string(),
  postalCode: z.string().nullable(),
  countryCode: z.string().length(2),
});
export type Address = z.infer<typeof Address>;

/** A store is a business location: the place where food is picked up. */
export const StoreSummary = z.object({
  id: Uuid,
  businessId: Uuid,
  name: z.string(),
  categoryId: Uuid,
  logo: ImageSet.nullable(),
  cover: ImageSet.nullable(),
  address: Address,
  location: GeoPoint,
  distanceM: z.number().nonnegative().nullable(),
  rating: Rating.nullable(),
  timezone: TimeZone,
  hasOffersNow: z.boolean(),
});
export type StoreSummary = z.infer<typeof StoreSummary>;

export const BusinessHours = z.object({
  weekday: z.number().int().min(0).max(6),
  opensAt: TimeOfDay,
  closesAt: TimeOfDay,
});
export type BusinessHours = z.infer<typeof BusinessHours>;

export const StoreDetail = StoreSummary.extend({
  description: z.string().nullable(),
  phone: z.string().nullable(),
  hours: z.array(BusinessHours),
});
export type StoreDetail = z.infer<typeof StoreDetail>;

export const OfferSummary = z.object({
  id: Uuid,
  title: z.string(),
  store: z.object({ id: Uuid, name: z.string(), logo: ImageSet.nullable(), location: GeoPoint }),
  categoryId: Uuid,
  image: ImageSet.nullable(),
  price: Money,
  referenceValue: Money.nullable(),
  pickup: PickupWindow,
  quantityAvailable: z.number().int().nonnegative(),
  status: OfferStatus,
  distanceM: z.number().nonnegative().nullable(),
  rating: Rating.nullable(),
});
export type OfferSummary = z.infer<typeof OfferSummary>;

export const OfferDetail = OfferSummary.extend({
  description: z.string(),
  contentsNote: z.string().nullable(),
  allergens: z.array(Allergen),
  dietaryTags: z.array(DietaryTag),
  maxPerOrder: z.number().int().min(1).max(20),
  storeDetail: StoreDetail,
  terms: z.string(),
});
export type OfferDetail = z.infer<typeof OfferDetail>;

export const HomeFeed = z.object({
  nearby: z.array(OfferSummary),
  pickupSoon: z.array(OfferSummary),
  favoritesAvailable: z.array(OfferSummary),
  newStores: z.array(StoreSummary),
  categories: z.array(Category),
});
export type HomeFeed = z.infer<typeof HomeFeed>;

export const RADIUS_OPTIONS_M = [1000, 2000, 5000, 10000] as const;

export const OfferFilters = z.object({
  categoryIds: z.array(Uuid).max(20).optional(),
  maxPriceMinor: z.number().int().positive().optional(),
  pickupFrom: IsoDateTime.optional(),
  pickupTo: IsoDateTime.optional(),
  dietary: z.array(DietaryTag).optional(),
  availableOnly: z.boolean().optional(),
  minRating: z.number().min(1).max(5).optional(),
});
export type OfferFilters = z.infer<typeof OfferFilters>;

export const OffersQuery = OfferFilters.extend({
  near: GeoPoint.optional(),
  radiusM: z.number().int().min(100).max(50000).optional(),
  bbox: BoundingBox.optional(),
  sort: OfferSort.default('relevance'),
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(PAGE_LIMIT_MAX).default(PAGE_LIMIT_DEFAULT),
}).refine((q) => q.near !== undefined || q.bbox !== undefined, {
  message: 'Either near or bbox is required',
});
export type OffersQuery = z.input<typeof OffersQuery>;

export const MapPoint = z.object({
  kind: z.literal('point'),
  offerId: Uuid,
  storeId: Uuid,
  location: GeoPoint,
  available: z.boolean(),
});
export const MapCluster = z.object({
  kind: z.literal('cluster'),
  location: GeoPoint,
  count: z.number().int().positive(),
});
export const MapFeature = z.discriminatedUnion('kind', [MapPoint, MapCluster]);
export type MapFeature = z.infer<typeof MapFeature>;

export const StorePage = z.object({
  store: StoreDetail,
  offers: z.array(OfferSummary),
  isFavorite: z.boolean(),
});
export type StorePage = z.infer<typeof StorePage>;

export const SearchResults = z.object({
  stores: z.array(StoreSummary),
  offers: z.array(OfferSummary),
});
export type SearchResults = z.infer<typeof SearchResults>;

export const FavoriteStore = z.object({
  store: StoreSummary,
  availableOffers: z.number().int().nonnegative(),
});
export type FavoriteStore = z.infer<typeof FavoriteStore>;
