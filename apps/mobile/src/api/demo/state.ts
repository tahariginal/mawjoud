/**
 * DEMO ADAPTER STATE — development only. In-memory stand-in for the backend so every screen
 * can be built and reviewed before the API exists. It mirrors the documented rules
 * (stock holds, order state machine, idempotency) but is NOT the source of truth for anything.
 */
import {
  canTransitionOrder,
  type GeoPoint,
  type Me,
  type NotificationPreferences,
  type OfferDetail,
  type OfferStatus,
  type OfferSummary,
  type Order,
  type OrderStatus,
  type StoreDetail,
  type StoreSummary,
  type Allergen,
  type DietaryTag,
} from '@mawjood/contracts';

import { ApiError } from '../errors';
import {
  DEMO_CURRENCY,
  DEMO_MERCHANT_STORE_INDEX,
  DEMO_SEEDED_PICKUP_CODES,
  DEMO_TERMS,
  demoIds,
  demoOfferSeeds,
  demoStores,
  demoUserId,
} from './fixtures';

export const NO_SHOW_GRACE_MINUTES = 30;
const MINUTE = 60_000;

export type DemoOffer = {
  id: string;
  storeId: string;
  categoryId: string;
  title: string;
  description: string;
  contentsNote: string | null;
  priceMinor: number;
  referenceMinor: number | null;
  quantityTotal: number;
  quantityAvailable: number;
  maxPerOrder: number;
  pickupStart: string;
  pickupEnd: string;
  status: OfferStatus;
  allergens: Allergen[];
  dietaryTags: DietaryTag[];
  version: number;
};

export type DemoOrder = {
  order: Order;
  userId: string;
  offerId: string;
  quantity: number;
  customerInitial: string;
};

const iso = (ms: number) => new Date(ms).toISOString();

function seedOffers(now: number): DemoOffer[] {
  return demoOfferSeeds.map((seed) => {
    const storeSeed = demoStores[seed.storeIndex];
    if (!storeSeed) throw new Error(`Demo store ${seed.storeIndex} missing`);
    const start = now + seed.startInMin * MINUTE;
    return {
      id: seed.id,
      storeId: storeSeed.id,
      categoryId: storeSeed.categoryId,
      title: seed.title,
      description: seed.description,
      contentsNote: seed.contentsNote,
      priceMinor: seed.priceMinor,
      referenceMinor: seed.referenceMinor,
      quantityTotal: Math.max(seed.quantity, 1),
      quantityAvailable: seed.quantity,
      maxPerOrder: seed.maxPerOrder,
      pickupStart: iso(start),
      pickupEnd: iso(start + seed.durationMin * MINUTE),
      status: seed.quantity > 0 ? 'ACTIVE' : 'SOLD_OUT',
      allergens: seed.allergens,
      dietaryTags: seed.dietaryTags,
      version: 0,
    };
  });
}

export const demoMe = (): Me => ({
  id: demoUserId,
  email: 'demo@mawjood.test',
  emailVerified: true,
  displayName: 'Demo user',
  locale: 'en',
  platformRole: 'CUSTOMER',
  memberships: [
    {
      businessId: merchantStore().businessId,
      businessName: merchantStore().name,
      role: 'OWNER',
    },
  ],
});

export function merchantStore(): (typeof demoStores)[number] {
  const s = demoStores[DEMO_MERCHANT_STORE_INDEX];
  if (!s) throw new Error('Demo merchant store missing');
  return s;
}

export function createDemoState(now = Date.now()) {
  return {
    offers: seedOffers(now),
    orders: new Map<string, DemoOrder>(),
    favorites: new Set<string>(),
    session: null as Me | null,
    pendingEmailVerification: false,
    idempotency: new Map<string, unknown>(),
    pickedUpCodes: new Map<string, string>(),
    staff: [
      {
        userId: demoUserId,
        displayName: 'Demo user',
        email: 'demo@mawjood.test',
        role: 'OWNER' as const,
      },
      {
        userId: demoIds.id(0x502),
        displayName: 'Salma (staff)',
        email: 'staff@mawjood.test',
        role: 'STAFF' as const,
      },
    ],
    notificationPreferences: {
      types: {
        FAVORITE_AVAILABLE: { push: true, email: false },
        ORDER_UPDATES: { push: true, email: true },
        PICKUP_REMINDERS: { push: true, email: false },
        MARKETING: { push: false, email: false },
      },
      quietHours: { enabled: true, start: '22:00', end: '08:00' },
      maxFavoriteAlertsPerDay: 2,
    } satisfies NotificationPreferences as NotificationPreferences,
  };
}

export type DemoState = ReturnType<typeof createDemoState>;

/** Great-circle distance in meters. Demo only — the real API computes distance in PostGIS. */
export function distanceMeters(a: GeoPoint, b: GeoPoint): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h));
}

export function findStore(id: string): (typeof demoStores)[number] {
  const s = demoStores.find((x) => x.id === id);
  if (!s) throw new ApiError('NOT_FOUND', 'Store not found', { status: 404 });
  return s;
}

const money = (amountMinor: number) => ({ amountMinor, currency: DEMO_CURRENCY });

/** Keeps offer status consistent with time and stock (the real API does this in jobs). */
export function refreshOfferStatus(offer: DemoOffer, now: number): void {
  if (offer.status === 'REMOVED' || offer.status === 'ENDED' || offer.status === 'PAUSED') return;
  if (Date.parse(offer.pickupEnd) < now) {
    offer.status = 'ENDED';
    return;
  }
  offer.status = offer.quantityAvailable > 0 ? 'ACTIVE' : 'SOLD_OUT';
}

export function toStoreSummary(
  state: DemoState,
  s: (typeof demoStores)[number],
  near: GeoPoint | null,
  now: number,
): StoreSummary {
  return {
    id: s.id,
    businessId: s.businessId,
    name: s.name,
    categoryId: s.categoryId,
    logo: s.logo,
    cover: s.cover,
    address: s.address,
    location: s.location,
    distanceM: near ? distanceMeters(near, s.location) : null,
    rating: s.rating,
    timezone: s.timezone,
    hasOffersNow: state.offers.some((o) => {
      refreshOfferStatus(o, now);
      return o.storeId === s.id && o.status === 'ACTIVE';
    }),
  };
}

export function toStoreDetail(
  state: DemoState,
  s: (typeof demoStores)[number],
  near: GeoPoint | null,
  now: number,
): StoreDetail {
  return {
    ...toStoreSummary(state, s, near, now),
    description: s.description,
    phone: s.phone,
    hours: s.hours,
  };
}

export function toOfferSummary(offer: DemoOffer, near: GeoPoint | null): OfferSummary {
  const s = findStore(offer.storeId);
  return {
    id: offer.id,
    title: offer.title,
    store: { id: s.id, name: s.name, logo: s.logo, location: s.location },
    categoryId: offer.categoryId,
    image: null,
    price: money(offer.priceMinor),
    referenceValue: offer.referenceMinor === null ? null : money(offer.referenceMinor),
    pickup: { start: offer.pickupStart, end: offer.pickupEnd, timezone: s.timezone },
    quantityAvailable: offer.quantityAvailable,
    status: offer.status,
    distanceM: near ? distanceMeters(near, s.location) : null,
    rating: s.rating,
  };
}

export function toOfferDetail(
  state: DemoState,
  offer: DemoOffer,
  near: GeoPoint | null,
  now: number,
): OfferDetail {
  return {
    ...toOfferSummary(offer, near),
    description: offer.description,
    contentsNote: offer.contentsNote,
    allergens: offer.allergens,
    dietaryTags: offer.dietaryTags,
    maxPerOrder: offer.maxPerOrder,
    storeDetail: toStoreDetail(state, findStore(offer.storeId), near, now),
    terms: DEMO_TERMS,
  };
}

export function findOffer(state: DemoState, id: string): DemoOffer {
  const offer = state.offers.find((o) => o.id === id);
  if (!offer) throw new ApiError('OFFER_NOT_FOUND', 'Offer not found', { status: 404 });
  return offer;
}

export function releaseStock(state: DemoState, entry: DemoOrder): void {
  const offer = state.offers.find((o) => o.id === entry.offerId);
  if (!offer) return;
  offer.quantityAvailable = Math.min(offer.quantityTotal, offer.quantityAvailable + entry.quantity);
}

/** Guarded transition — throws on any move the documented state machine forbids. */
export function transition(entry: DemoOrder, to: OrderStatus): void {
  if (!canTransitionOrder(entry.order.status, to)) {
    throw new ApiError('ORDER_INVALID_TRANSITION', `${entry.order.status} -> ${to}`, {
      status: 409,
    });
  }
  entry.order.status = to;
}

/** Applies the time-based transitions the real backend runs as scheduled jobs. */
export function applyTimeTransitions(state: DemoState, entry: DemoOrder, now: number): void {
  const o = entry.order;
  if (o.status === 'CONFIRMED' && Date.parse(o.pickup.start) <= now) {
    transition(entry, 'READY_FOR_PICKUP');
  }
  if (
    (o.status === 'CONFIRMED' || o.status === 'READY_FOR_PICKUP') &&
    Date.parse(o.pickup.end) + NO_SHOW_GRACE_MINUTES * MINUTE < now
  ) {
    transition(entry, 'NO_SHOW');
  }
  // Policy placeholder (D7): customers may cancel until the pickup window starts.
  o.cancellable = o.status === 'CONFIRMED' && Date.parse(o.pickup.start) > now;
  o.reviewable = o.status === 'PICKED_UP';
}

/** Seeds orders from other (fictional) customers at the demo merchant store. */
export function seedMerchantOrders(state: DemoState, now: number, makeToken: () => string): void {
  const s = merchantStore();
  DEMO_SEEDED_PICKUP_CODES.forEach((code, index) => {
    const orderId = demoIds.id(0x600 + index);
    const offerId = demoIds.id(0x401);
    state.orders.set(orderId, {
      userId: demoIds.id(0x700 + index),
      offerId,
      quantity: 1,
      customerInitial: index === 0 ? 'Y' : 'O',
      order: {
        id: orderId,
        shortCode: `MW-DEMO${index + 1}`,
        status: 'READY_FOR_PICKUP',
        store: {
          id: s.id,
          name: s.name,
          address: s.address,
          location: s.location,
          timezone: s.timezone,
        },
        items: [
          {
            offerId,
            title: 'Assorted bread & viennoiseries',
            quantity: 1,
            unitPrice: money(3500),
            referenceValue: money(9000),
          },
        ],
        breakdown: {
          unitPrice: money(3500),
          subtotal: money(3500),
          fees: money(0),
          discount: money(0),
          tax: money(0),
          total: money(3500),
        },
        pickup: {
          start: iso(now - 30 * MINUTE),
          end: iso(now + 90 * MINUTE),
          timezone: s.timezone,
        },
        paymentMethod: 'PAY_AT_PICKUP',
        pickupPass: { token: makeToken(), code },
        pickedUpAt: null,
        cancellable: false,
        cancelledReason: null,
        reviewable: false,
        createdAt: iso(now - 3 * 60 * MINUTE),
      },
    });
  });
}

export { money, iso, MINUTE };
