import { z } from 'zod';

import { GeoPoint, IsoDateTime, Money, Uuid } from './common.ts';
import { Address, BusinessHours, PickupWindow } from './discovery.ts';
import {
  Allergen,
  BusinessRole,
  BusinessStatus,
  DietaryTag,
  OfferStatus,
  OrderStatus,
} from './enums.ts';

export const MerchantApplicationRequest = z.strictObject({
  businessName: z.string().trim().min(2).max(80),
  legalName: z.string().trim().min(2).max(120),
  categoryId: Uuid,
  addressLine: z.string().trim().min(3).max(160),
  city: z.string().trim().min(2).max(80),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9 ]{8,20}$/, 'phone'),
  contactEmail: z.email(),
  /** Store pin, captured on site by the applicant (no geocoding yet). */
  location: GeoPoint,
});
export type MerchantApplicationRequest = z.infer<typeof MerchantApplicationRequest>;

export const MerchantBusiness = z.object({
  id: Uuid,
  name: z.string(),
  status: BusinessStatus,
  role: BusinessRole,
  locations: z.array(
    z.object({
      id: Uuid,
      name: z.string(),
      address: Address,
      location: GeoPoint,
      timezone: z.string(),
      hours: z.array(BusinessHours),
    }),
  ),
});
export type MerchantBusiness = z.infer<typeof MerchantBusiness>;

export const OFFER_TITLE_MAX = 80;
export const OFFER_DESCRIPTION_MAX = 500;

const offerFields = {
  locationId: Uuid,
  categoryId: Uuid,
  title: z.string().trim().min(3).max(OFFER_TITLE_MAX),
  description: z.string().trim().max(OFFER_DESCRIPTION_MAX),
  quantity: z.number().int().min(1).max(500),
  priceMinor: z.number().int().positive(),
  referenceValueMinor: z.number().int().positive().nullable(),
  pickupStart: IsoDateTime,
  pickupEnd: IsoDateTime,
  maxPerOrder: z.number().int().min(1).max(20),
  allergens: z.array(Allergen).max(14),
  dietaryTags: z.array(DietaryTag).max(5),
};

type OfferRuleFields = {
  priceMinor: number;
  referenceValueMinor: number | null;
  pickupStart: string;
  pickupEnd: string;
};

const referenceAbovePrice = (o: OfferRuleFields) =>
  o.referenceValueMinor === null || o.referenceValueMinor > o.priceMinor;
const endAfterStart = (o: OfferRuleFields) => Date.parse(o.pickupEnd) > Date.parse(o.pickupStart);

export const MerchantOfferInput = z
  .strictObject(offerFields)
  .refine(referenceAbovePrice, {
    message: 'Reference value must be greater than the price',
    path: ['referenceValueMinor'],
  })
  .refine(endAfterStart, { message: 'Pickup end must be after pickup start', path: ['pickupEnd'] });
export type MerchantOfferInput = z.infer<typeof MerchantOfferInput>;

/** PATCH body: the full offer plus the version read by the client (optimistic locking). */
export const UpdateMerchantOfferRequest = z
  .strictObject({ ...offerFields, version: z.number().int().nonnegative() })
  .refine(referenceAbovePrice, {
    message: 'Reference value must be greater than the price',
    path: ['referenceValueMinor'],
  })
  .refine(endAfterStart, { message: 'Pickup end must be after pickup start', path: ['pickupEnd'] });
export type UpdateMerchantOfferRequest = z.infer<typeof UpdateMerchantOfferRequest>;

/** Replaces a location's weekly opening hours (one entry per weekday at most). */
export const SetBusinessHoursRequest = z
  .array(BusinessHours)
  .max(7)
  .refine((hours) => new Set(hours.map((h) => h.weekday)).size === hours.length, {
    message: 'One entry per weekday',
  });
export type SetBusinessHoursRequest = z.infer<typeof SetBusinessHoursRequest>;

export const MerchantOffer = z.object({
  id: Uuid,
  locationId: Uuid,
  categoryId: Uuid,
  title: z.string(),
  description: z.string(),
  status: OfferStatus,
  price: Money,
  referenceValue: Money.nullable(),
  pickup: PickupWindow,
  quantityTotal: z.number().int().nonnegative(),
  quantityAvailable: z.number().int().nonnegative(),
  quantityReservedOrSold: z.number().int().nonnegative(),
  maxPerOrder: z.number().int().positive(),
  allergens: z.array(Allergen),
  dietaryTags: z.array(DietaryTag),
  version: z.number().int().nonnegative(),
});
export type MerchantOffer = z.infer<typeof MerchantOffer>;

export const MerchantOrder = z.object({
  id: Uuid,
  shortCode: z.string(),
  status: OrderStatus,
  customerInitial: z.string().max(2),
  offerTitle: z.string(),
  quantity: z.number().int().positive(),
  pickup: PickupWindow,
  pickedUpAt: IsoDateTime.nullable(),
});
export type MerchantOrder = z.infer<typeof MerchantOrder>;

export const PICKUP_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const PickupValidateRequest = z.union([
  z.strictObject({ token: z.string().min(16) }),
  z.strictObject({ code: z.string().regex(/^[A-Z0-9]{6}$/), locationId: Uuid }),
]);
export type PickupValidateRequest = z.infer<typeof PickupValidateRequest>;

export const PickupValidateResult = z.object({
  result: z.literal('VALIDATED'),
  order: MerchantOrder,
  validatedAt: IsoDateTime,
});
export type PickupValidateResult = z.infer<typeof PickupValidateResult>;

export const MerchantInsights = z.object({
  from: IsoDateTime,
  to: IsoDateTime,
  revenue: Money,
  ordersCompleted: z.number().int().nonnegative(),
  itemsRescued: z.number().int().nonnegative(),
  sellThroughRate: z.number().min(0).max(1).nullable(),
  noShowRate: z.number().min(0).max(1).nullable(),
});
export type MerchantInsights = z.infer<typeof MerchantInsights>;

export const StaffMember = z.object({
  userId: Uuid,
  displayName: z.string(),
  email: z.email(),
  role: BusinessRole,
});
export type StaffMember = z.infer<typeof StaffMember>;

export const InviteStaffRequest = z.strictObject({ email: z.email() });
export type InviteStaffRequest = z.infer<typeof InviteStaffRequest>;
