/** DEMO ADAPTER — customer endpoints. Development only. */
import {
  OffersQuery as OffersQuerySchema,
  PICKUP_CODE_ALPHABET,
  isUpcomingOrderStatus,
  type GeoPoint,
  type Order,
  type Quote,
} from '@mawjood/contracts';

import { newUuid, randomFromAlphabet } from '@/lib/ids';

import { ApiError } from '../errors';
import { tokenStorage } from '../tokenStorage';
import type { MawjoodApi } from '../types';
import { DEMO_CURRENCY, demoCategories, demoStores } from './fixtures';
import {
  MINUTE,
  applyTimeTransitions,
  demoMe,
  distanceMeters,
  findOffer,
  findStore,
  iso,
  money,
  refreshOfferStatus,
  releaseStock,
  toOfferDetail,
  toOfferSummary,
  toStoreDetail,
  toStoreSummary,
  transition,
  type DemoOrder,
  type DemoState,
} from './state';

const DEMO_REFRESH_TOKEN = 'demo-refresh-token';
/** Demo verification / reset code. Shown in the UI in demo mode only. */
export const DEMO_ONE_TIME_CODE = '123456';
const NEARBY_RADIUS_M = 10_000;

/** Deep copy so callers never mutate demo state (JSON-safe data only). */
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

type CustomerKeys =
  | 'restoreSession'
  | 'register'
  | 'login'
  | 'logout'
  | 'verifyEmail'
  | 'resendVerification'
  | 'forgotPassword'
  | 'resetPassword'
  | 'updateMe'
  | 'deleteAccount'
  | 'getAppConfig'
  | 'getHomeFeed'
  | 'listOffers'
  | 'getOffer'
  | 'getStore'
  | 'search'
  | 'listCategories'
  | 'listFavorites'
  | 'addFavorite'
  | 'removeFavorite'
  | 'quote'
  | 'createOrder'
  | 'listOrders'
  | 'getOrder'
  | 'cancelOrder'
  | 'reviewOrder'
  | 'getNotificationPreferences'
  | 'updateNotificationPreferences'
  | 'getImpact';

export type DemoCustomerApi = Pick<MawjoodApi, CustomerKeys>;

export function requireSession(state: DemoState) {
  if (!state.session) throw new ApiError('AUTH_REQUIRED', 'Sign in required', { status: 401 });
  return state.session;
}

export function createDemoCustomerApi(state: DemoState, now: () => number): DemoCustomerApi {
  const reviewed = new Set<string>();

  const activeOffers = () =>
    state.offers.filter((o) => {
      refreshOfferStatus(o, now());
      return o.status === 'ACTIVE' || o.status === 'SOLD_OUT';
    });

  const userOrders = (): DemoOrder[] => {
    const me = requireSession(state);
    return [...state.orders.values()].filter((e) => {
      applyTimeTransitions(state, e, now());
      return e.userId === me.id;
    });
  };

  const findUserOrder = (id: string): DemoOrder => {
    const entry = userOrders().find((e) => e.order.id === id);
    if (!entry) throw new ApiError('ORDER_NOT_FOUND', 'Order not found', { status: 404 });
    return entry;
  };

  function buildQuote(offerId: string, quantity: number): Quote {
    const offer = findOffer(state, offerId);
    refreshOfferStatus(offer, now());
    if (offer.status === 'SOLD_OUT')
      throw new ApiError('OFFER_SOLD_OUT', 'Sold out', { status: 409 });
    if (offer.status !== 'ACTIVE')
      throw new ApiError('OFFER_NOT_AVAILABLE', 'Not available', { status: 409 });
    if (quantity > offer.maxPerOrder) {
      throw new ApiError('OFFER_QUANTITY_LIMIT', 'Quantity limit', {
        status: 422,
        details: { max: offer.maxPerOrder },
      });
    }
    if (quantity > offer.quantityAvailable)
      throw new ApiError('OFFER_SOLD_OUT', 'Not enough left', { status: 409 });
    const subtotal = offer.priceMinor * quantity;
    // Fees, tax and discounts are 0 until the commercial policy is decided (D7).
    return {
      offerId,
      quantity,
      breakdown: {
        unitPrice: money(offer.priceMinor),
        subtotal: money(subtotal),
        fees: money(0),
        discount: money(0),
        tax: money(0),
        total: money(subtotal),
      },
      quoteVersion: `${offer.id}:${offer.version}:${offer.priceMinor}`,
    };
  }

  // Seed one completed order so history and impact are not empty.
  function seedHistory() {
    const offer = state.offers[0];
    const s = offer ? findStore(offer.storeId) : undefined;
    if (!offer || !s) return;
    const id = '00000000-0000-4000-8000-000000000a01';
    if (state.orders.has(id)) return;
    const t = now() - 3 * 24 * 60 * MINUTE;
    state.orders.set(id, {
      userId: demoMe().id,
      offerId: offer.id,
      quantity: 1,
      customerInitial: 'D',
      order: {
        id,
        shortCode: 'MW-H1ST0',
        status: 'PICKED_UP',
        store: {
          id: s.id,
          name: s.name,
          address: s.address,
          location: s.location,
          timezone: s.timezone,
        },
        items: [
          {
            offerId: offer.id,
            title: offer.title,
            quantity: 1,
            unitPrice: money(offer.priceMinor),
            referenceValue: offer.referenceMinor === null ? null : money(offer.referenceMinor),
          },
        ],
        breakdown: {
          unitPrice: money(offer.priceMinor),
          subtotal: money(offer.priceMinor),
          fees: money(0),
          discount: money(0),
          tax: money(0),
          total: money(offer.priceMinor),
        },
        pickup: { start: iso(t), end: iso(t + 60 * MINUTE), timezone: s.timezone },
        paymentMethod: 'PAY_AT_PICKUP',
        pickupPass: null,
        pickedUpAt: iso(t + 20 * MINUTE),
        cancellable: false,
        cancelledReason: null,
        reviewable: true,
        createdAt: iso(t - 4 * 60 * MINUTE),
      },
    });
  }
  seedHistory();

  return {
    getAppConfig: async () => ({
      minSupportedVersion: '0.0.0',
      flags: {},
      supportEmail: null,
      legal: { termsUrl: null, privacyUrl: null },
    }),

    async restoreSession() {
      const token = await tokenStorage.getRefreshToken();
      state.session = token === DEMO_REFRESH_TOKEN ? demoMe() : null;
      return state.session;
    },
    async register(input) {
      state.session = {
        ...demoMe(),
        email: input.email,
        displayName: input.displayName,
        emailVerified: false,
      };
      await tokenStorage.setRefreshToken(DEMO_REFRESH_TOKEN);
      return {
        me: state.session,
        tokens: {
          accessToken: 'demo',
          accessTokenExpiresAt: iso(now() + 15 * MINUTE),
          refreshToken: DEMO_REFRESH_TOKEN,
        },
      };
    },
    async login(input) {
      state.session = { ...demoMe(), email: input.email };
      await tokenStorage.setRefreshToken(DEMO_REFRESH_TOKEN);
      return {
        me: state.session,
        tokens: {
          accessToken: 'demo',
          accessTokenExpiresAt: iso(now() + 15 * MINUTE),
          refreshToken: DEMO_REFRESH_TOKEN,
        },
      };
    },
    async logout() {
      state.session = null;
      await tokenStorage.clear();
    },
    async verifyEmail(input) {
      const me = requireSession(state);
      if (input.code !== DEMO_ONE_TIME_CODE)
        throw new ApiError('AUTH_CODE_INVALID', 'Invalid code', { status: 400 });
      state.session = { ...me, emailVerified: true };
      return state.session;
    },
    resendVerification: async () => undefined,
    forgotPassword: async () => undefined,
    async resetPassword(input) {
      if (input.code !== DEMO_ONE_TIME_CODE)
        throw new ApiError('AUTH_CODE_INVALID', 'Invalid code', { status: 400 });
    },
    async updateMe(input) {
      const me = requireSession(state);
      state.session = { ...me, ...input };
      return state.session;
    },
    async deleteAccount() {
      requireSession(state);
      state.session = null;
      await tokenStorage.clear();
    },

    async getHomeFeed(near: GeoPoint) {
      const t = now();
      const offers = activeOffers()
        .map((o) => toOfferSummary(o, near))
        .filter((o) => (o.distanceM ?? 0) <= NEARBY_RADIUS_M);
      const byDistance = [...offers].sort((a, b) => (a.distanceM ?? 0) - (b.distanceM ?? 0));
      return {
        nearby: byDistance.filter((o) => o.status === 'ACTIVE'),
        pickupSoon: byDistance.filter(
          (o) => o.status === 'ACTIVE' && Date.parse(o.pickup.start) - t <= 2 * 60 * MINUTE,
        ),
        favoritesAvailable: byDistance.filter(
          (o) => o.status === 'ACTIVE' && state.favorites.has(o.store.id),
        ),
        newStores: demoStores
          .filter((s) => s.rating === null)
          .map((s) => toStoreSummary(state, s, near, t)),
        categories: demoCategories,
      };
    },

    async listOffers(rawQuery) {
      const q = OffersQuerySchema.parse(rawQuery);
      let items = activeOffers().map((o) => toOfferSummary(o, q.near ?? null));
      if (q.near && q.radiusM) {
        const near = q.near;
        const radius = q.radiusM;
        items = items.filter((o) => {
          const s = findStore(o.store.id);
          return distanceMeters(near, s.location) <= radius;
        });
      }
      if (q.bbox) {
        const b = q.bbox;
        items = items.filter(
          (o) =>
            o.store.location.lat >= b.minLat &&
            o.store.location.lat <= b.maxLat &&
            o.store.location.lng >= b.minLng &&
            o.store.location.lng <= b.maxLng,
        );
      }
      if (q.categoryIds?.length) items = items.filter((o) => q.categoryIds?.includes(o.categoryId));
      if (q.maxPriceMinor !== undefined)
        items = items.filter((o) => o.price.amountMinor <= (q.maxPriceMinor ?? 0));
      if (q.availableOnly) items = items.filter((o) => o.status === 'ACTIVE');
      if (q.minRating !== undefined)
        items = items.filter((o) => (o.rating?.average ?? 0) >= (q.minRating ?? 0));
      if (q.dietary?.length) {
        items = items.filter((o) => {
          const tags = findOffer(state, o.id).dietaryTags;
          return (q.dietary ?? []).every((d) => tags.includes(d));
        });
      }
      if (q.pickupFrom)
        items = items.filter((o) => Date.parse(o.pickup.end) >= Date.parse(q.pickupFrom ?? ''));
      if (q.pickupTo)
        items = items.filter((o) => Date.parse(o.pickup.start) <= Date.parse(q.pickupTo ?? ''));
      const sorters: Record<
        typeof q.sort,
        (a: (typeof items)[number], b: (typeof items)[number]) => number
      > = {
        relevance: (a, b) =>
          Number(b.status === 'ACTIVE') - Number(a.status === 'ACTIVE') ||
          (a.distanceM ?? 0) - (b.distanceM ?? 0),
        distance: (a, b) => (a.distanceM ?? 0) - (b.distanceM ?? 0),
        price: (a, b) => a.price.amountMinor - b.price.amountMinor,
        pickup_time: (a, b) => Date.parse(a.pickup.start) - Date.parse(b.pickup.start),
      };
      items.sort(sorters[q.sort]);
      const offset = q.cursor ? Number(q.cursor) : 0;
      const page = items.slice(offset, offset + q.limit);
      const next = offset + page.length;
      return {
        data: page,
        page: {
          nextCursor: next < items.length ? String(next) : null,
          hasMore: next < items.length,
        },
      };
    },

    async getOffer(id, near) {
      const offer = findOffer(state, id);
      refreshOfferStatus(offer, now());
      return toOfferDetail(state, offer, near, now());
    },
    async getStore(id, near) {
      const s = findStore(id);
      return {
        store: toStoreDetail(state, s, near, now()),
        offers: activeOffers()
          .filter((o) => o.storeId === id)
          .map((o) => toOfferSummary(o, near)),
        isFavorite: state.favorites.has(id),
      };
    },
    async search(text, near) {
      const needle = text.trim().toLowerCase();
      if (needle.length === 0) return { stores: [], offers: [] };
      return {
        stores: demoStores
          .filter((s) => s.name.toLowerCase().includes(needle))
          .map((s) => toStoreSummary(state, s, near, now())),
        offers: activeOffers()
          .filter(
            (o) =>
              o.title.toLowerCase().includes(needle) ||
              findStore(o.storeId).name.toLowerCase().includes(needle),
          )
          .map((o) => toOfferSummary(o, near)),
      };
    },
    listCategories: async () => demoCategories,

    async listFavorites(near) {
      requireSession(state);
      return [...state.favorites].map((storeId) => {
        const s = findStore(storeId);
        return {
          store: toStoreSummary(state, s, near, now()),
          availableOffers: activeOffers().filter(
            (o) => o.storeId === storeId && o.status === 'ACTIVE',
          ).length,
        };
      });
    },
    async addFavorite(storeId) {
      requireSession(state);
      findStore(storeId);
      state.favorites.add(storeId);
    },
    async removeFavorite(storeId) {
      requireSession(state);
      state.favorites.delete(storeId);
    },

    async quote(input) {
      requireSession(state);
      return buildQuote(input.offerId, input.quantity);
    },
    async createOrder(input, idempotencyKey) {
      const me = requireSession(state);
      const replayKey = `order:${me.id}:${idempotencyKey}`;
      const fingerprint = JSON.stringify(input);
      const previous = state.idempotency.get(replayKey) as
        { fingerprint: string; response: Order } | undefined;
      if (previous) {
        if (previous.fingerprint !== fingerprint) {
          throw new ApiError('IDEMPOTENCY_KEY_REUSED', 'Key reused with another body', {
            status: 409,
          });
        }
        return previous.response;
      }
      if (!me.emailVerified)
        throw new ApiError('AUTH_EMAIL_NOT_VERIFIED', 'Verify email first', { status: 403 });

      const quote = buildQuote(input.offerId, input.quantity);
      if (input.quoteVersion && input.quoteVersion !== quote.quoteVersion) {
        throw new ApiError('PRICE_CHANGED', 'Price changed', { status: 409 });
      }
      const offer = findOffer(state, input.offerId);
      // Conditional decrement (mirrors `UPDATE … WHERE quantity_available >= $qty`).
      if (offer.quantityAvailable < input.quantity)
        throw new ApiError('OFFER_SOLD_OUT', 'Sold out', { status: 409 });
      offer.quantityAvailable -= input.quantity;
      refreshOfferStatus(offer, now());

      const s = findStore(offer.storeId);
      const t = now();
      const order: Order = {
        id: newUuid(),
        shortCode: `MW-${randomFromAlphabet(5, PICKUP_CODE_ALPHABET)}`,
        status: 'CREATED',
        store: {
          id: s.id,
          name: s.name,
          address: s.address,
          location: s.location,
          timezone: s.timezone,
        },
        items: [
          {
            offerId: offer.id,
            title: offer.title,
            quantity: input.quantity,
            unitPrice: money(offer.priceMinor),
            referenceValue: offer.referenceMinor === null ? null : money(offer.referenceMinor),
          },
        ],
        breakdown: quote.breakdown,
        pickup: { start: offer.pickupStart, end: offer.pickupEnd, timezone: s.timezone },
        paymentMethod: 'PAY_AT_PICKUP',
        pickupPass: {
          token: newUuid().replace(/-/g, ''),
          code: randomFromAlphabet(6, PICKUP_CODE_ALPHABET),
        },
        pickedUpAt: null,
        cancellable: true,
        cancelledReason: null,
        reviewable: false,
        createdAt: iso(t),
      };
      const entry: DemoOrder = {
        order,
        userId: me.id,
        offerId: offer.id,
        quantity: input.quantity,
        customerInitial: me.displayName.charAt(0).toUpperCase(),
      };
      // Reservation without online payment: confirmed immediately (ADR-015).
      transition(entry, 'CONFIRMED');
      applyTimeTransitions(state, entry, t);
      state.orders.set(order.id, entry);

      const response = clone(order);
      state.idempotency.set(replayKey, { fingerprint, response });
      return response;
    },
    async listOrders(scope) {
      const items = userOrders()
        .filter((e) => (scope === 'upcoming') === isUpcomingOrderStatus(e.order.status))
        .sort((a, b) => Date.parse(b.order.createdAt) - Date.parse(a.order.createdAt))
        .map((e) => clone(e.order));
      return { data: items, page: { nextCursor: null, hasMore: false } };
    },
    getOrder: async (id) => clone(findUserOrder(id).order),
    async cancelOrder(id, input) {
      const entry = findUserOrder(id);
      if (entry.order.status === 'CANCELLED') return clone(entry.order);
      if (!entry.order.cancellable)
        throw new ApiError('ORDER_CANCELLATION_CLOSED', 'Too late to cancel', { status: 409 });
      transition(entry, 'CANCELLED');
      entry.order.cancelledReason = input.reason ?? null;
      releaseStock(state, entry);
      applyTimeTransitions(state, entry, now());
      return clone(entry.order);
    },
    async reviewOrder(id) {
      const entry = findUserOrder(id);
      if (entry.order.status !== 'PICKED_UP' || reviewed.has(id)) {
        throw new ApiError('ORDER_INVALID_TRANSITION', 'Cannot review this order', { status: 409 });
      }
      reviewed.add(id);
      entry.order.reviewable = false;
    },

    async getNotificationPreferences() {
      requireSession(state);
      return clone(state.notificationPreferences);
    },
    async updateNotificationPreferences(input) {
      requireSession(state);
      state.notificationPreferences = clone(input);
      return clone(input);
    },
    async getImpact() {
      const done = userOrders().filter((e) => e.order.status === 'PICKED_UP');
      const saved = done.reduce((sum, e) => {
        const item = e.order.items[0];
        if (!item?.referenceValue) return sum;
        return sum + (item.referenceValue.amountMinor - item.unitPrice.amountMinor) * item.quantity;
      }, 0);
      return {
        ordersCompleted: done.length,
        itemsRescued: done.reduce((sum, e) => sum + e.quantity, 0),
        moneySaved: { amountMinor: Math.max(0, saved), currency: DEMO_CURRENCY },
        // Pending sourced impact factors (D8): never invent a CO2e number.
        co2eKg: null,
        methodology: null,
      };
    },
  };
}
