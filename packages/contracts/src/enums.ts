import { z } from 'zod';

export const OrderStatus = z.enum([
  'CREATED',
  'PAYMENT_PENDING',
  'CONFIRMED',
  'READY_FOR_PICKUP',
  'PICKED_UP',
  'CANCELLED',
  'EXPIRED',
  'FAILED',
  'NO_SHOW',
]);
export type OrderStatus = z.infer<typeof OrderStatus>;

export const PaymentStatus = z.enum([
  'PENDING',
  'PROCESSING',
  'PAID',
  'FAILED',
  'CANCELLED',
  'REFUNDED',
  'PARTIALLY_REFUNDED',
]);
export type PaymentStatus = z.infer<typeof PaymentStatus>;

export const OfferStatus = z.enum([
  'DRAFT',
  'SCHEDULED',
  'ACTIVE',
  'PAUSED',
  'SOLD_OUT',
  'ENDED',
  'REMOVED',
]);
export type OfferStatus = z.infer<typeof OfferStatus>;

export const PlatformRole = z.enum(['CUSTOMER', 'ADMIN', 'SUPER_ADMIN']);
export type PlatformRole = z.infer<typeof PlatformRole>;

export const BusinessRole = z.enum(['OWNER', 'STAFF']);
export type BusinessRole = z.infer<typeof BusinessRole>;

export const BusinessStatus = z.enum(['PENDING_REVIEW', 'ACTIVE', 'SUSPENDED', 'REJECTED']);
export type BusinessStatus = z.infer<typeof BusinessStatus>;

export const DietaryTag = z.enum(['VEGETARIAN', 'VEGAN', 'GLUTEN_FREE', 'DAIRY_FREE', 'HALAL']);
export type DietaryTag = z.infer<typeof DietaryTag>;

/** The 14 allergen groups commonly required on food labels. */
export const Allergen = z.enum([
  'GLUTEN',
  'CRUSTACEANS',
  'EGGS',
  'FISH',
  'PEANUTS',
  'SOYA',
  'MILK',
  'TREE_NUTS',
  'CELERY',
  'MUSTARD',
  'SESAME',
  'SULPHITES',
  'LUPIN',
  'MOLLUSCS',
]);
export type Allergen = z.infer<typeof Allergen>;

export const OfferSort = z.enum(['relevance', 'distance', 'price', 'pickup_time']);
export type OfferSort = z.infer<typeof OfferSort>;

export const PickupMethod = z.enum(['QR', 'CODE', 'MANUAL_OVERRIDE']);
export type PickupMethod = z.infer<typeof PickupMethod>;

export const NotificationType = z.enum([
  'FAVORITE_AVAILABLE',
  'ORDER_UPDATES',
  'PICKUP_REMINDERS',
  'MARKETING',
]);
export type NotificationType = z.infer<typeof NotificationType>;
