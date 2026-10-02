/** DEMO ADAPTER — merchant endpoints. Development only. */
import {
  InviteStaffRequest,
  MerchantApplicationRequest,
  MerchantOfferInput,
  type MerchantOffer,
  type MerchantOrder,
  type PickupValidateResult,
} from '@mawjood/contracts';

import { newUuid } from '@/lib/ids';

import { ApiError } from '../errors';
import type { MawjoodApi } from '../types';
import { DEMO_CURRENCY, demoStores } from './fixtures';
import { requireSession } from './customer';
import {
  NO_SHOW_GRACE_MINUTES,
  MINUTE,
  applyTimeTransitions,
  findStore,
  iso,
  money,
  refreshOfferStatus,
  transition,
  type DemoOffer,
  type DemoOrder,
  type DemoState,
} from './state';

type MerchantKeys =
  | 'submitMerchantApplication'
  | 'listMerchantBusinesses'
  | 'listMerchantOffers'
  | 'getMerchantOffer'
  | 'createMerchantOffer'
  | 'updateMerchantOffer'
  | 'setMerchantOfferPaused'
  | 'endMerchantOffer'
  | 'listMerchantOrders'
  | 'validatePickup'
  | 'getMerchantInsights'
  | 'listStaff'
  | 'inviteStaff';

export type DemoMerchantApi = Pick<MawjoodApi, MerchantKeys>;

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export function createDemoMerchantApi(state: DemoState, now: () => number): DemoMerchantApi {
  function memberBusinessIds(): string[] {
    return requireSession(state).memberships.map((m) => m.businessId);
  }

  function requireOwnerOf(businessId: string) {
    const membership = requireSession(state).memberships.find((m) => m.businessId === businessId);
    if (!membership) throw new ApiError('NOT_FOUND', 'Business not found', { status: 404 });
    return membership;
  }

  function ownOffer(id: string): DemoOffer {
    const offer = state.offers.find((o) => o.id === id);
    if (!offer || !memberBusinessIds().includes(findStore(offer.storeId).businessId)) {
      throw new ApiError('OFFER_NOT_FOUND', 'Offer not found', { status: 404 });
    }
    refreshOfferStatus(offer, now());
    return offer;
  }

  function toMerchantOffer(o: DemoOffer): MerchantOffer {
    return {
      id: o.id,
      locationId: o.storeId,
      categoryId: o.categoryId,
      title: o.title,
      description: o.description,
      status: o.status,
      price: money(o.priceMinor),
      referenceValue: o.referenceMinor === null ? null : money(o.referenceMinor),
      pickup: { start: o.pickupStart, end: o.pickupEnd, timezone: findStore(o.storeId).timezone },
      quantityTotal: o.quantityTotal,
      quantityAvailable: o.quantityAvailable,
      quantityReservedOrSold: o.quantityTotal - o.quantityAvailable,
      maxPerOrder: o.maxPerOrder,
      allergens: o.allergens,
      dietaryTags: o.dietaryTags,
      version: o.version,
    };
  }

  function toMerchantOrder(e: DemoOrder): MerchantOrder {
    return {
      id: e.order.id,
      shortCode: e.order.shortCode,
      status: e.order.status,
      customerInitial: e.customerInitial,
      offerTitle: e.order.items[0]?.title ?? '',
      quantity: e.quantity,
      pickup: e.order.pickup,
      pickedUpAt: e.order.pickedUpAt,
    };
  }

  function ordersOfStore(storeId: string): DemoOrder[] {
    return [...state.orders.values()].filter((e) => {
      applyTimeTransitions(state, e, now());
      return e.order.store.id === storeId;
    });
  }

  return {
    async submitMerchantApplication(input) {
      requireSession(state);
      MerchantApplicationRequest.parse(input);
      // Applications are reviewed by an admin in the real system (pending Phase 9).
    },

    async listMerchantBusinesses() {
      const memberships = requireSession(state).memberships;
      return memberships.map((m) => {
        const stores = demoStores.filter((s) => s.businessId === m.businessId);
        return {
          id: m.businessId,
          name: m.businessName,
          status: 'ACTIVE' as const,
          role: m.role,
          locations: stores.map((s) => ({
            id: s.id,
            name: s.name,
            address: s.address,
            location: s.location,
            timezone: s.timezone,
            hours: s.hours,
          })),
        };
      });
    },

    async listMerchantOffers(businessId) {
      requireOwnerOf(businessId);
      return state.offers
        .filter((o) => findStore(o.storeId).businessId === businessId)
        .map((o) => {
          refreshOfferStatus(o, now());
          return toMerchantOffer(o);
        })
        .sort((a, b) => Date.parse(a.pickup.start) - Date.parse(b.pickup.start));
    },

    getMerchantOffer: async (id) => toMerchantOffer(ownOffer(id)),

    async createMerchantOffer(rawInput) {
      const input = MerchantOfferInput.parse(rawInput);
      const store = findStore(input.locationId);
      requireOwnerOf(store.businessId);
      const offer: DemoOffer = {
        id: newUuid(),
        storeId: store.id,
        categoryId: input.categoryId,
        title: input.title,
        description: input.description,
        contentsNote: null,
        priceMinor: input.priceMinor,
        referenceMinor: input.referenceValueMinor,
        quantityTotal: input.quantity,
        quantityAvailable: input.quantity,
        maxPerOrder: input.maxPerOrder,
        pickupStart: input.pickupStart,
        pickupEnd: input.pickupEnd,
        status: 'ACTIVE',
        allergens: input.allergens,
        dietaryTags: input.dietaryTags,
        version: 0,
      };
      refreshOfferStatus(offer, now());
      state.offers.push(offer);
      return toMerchantOffer(offer);
    },

    async updateMerchantOffer(id, rawInput, version) {
      const input = MerchantOfferInput.parse(rawInput);
      const offer = ownOffer(id);
      if (offer.version !== version) {
        throw new ApiError('CONFLICT_STALE_VERSION', 'Offer changed meanwhile', { status: 409 });
      }
      const taken = offer.quantityTotal - offer.quantityAvailable;
      if (input.quantity < taken) {
        throw new ApiError('VALIDATION_FAILED', 'Quantity below reserved units', {
          status: 400,
          details: { reason: 'QUANTITY_BELOW_RESERVED', reserved: taken },
        });
      }
      const lockedChanged =
        input.priceMinor !== offer.priceMinor ||
        input.pickupStart !== offer.pickupStart ||
        input.pickupEnd !== offer.pickupEnd;
      if (taken > 0 && lockedChanged) {
        throw new ApiError('VALIDATION_FAILED', 'Price and pickup window are locked once ordered', {
          status: 400,
          details: { reason: 'LOCKED_AFTER_ORDERS' },
        });
      }
      Object.assign(offer, {
        categoryId: input.categoryId,
        title: input.title,
        description: input.description,
        priceMinor: input.priceMinor,
        referenceMinor: input.referenceValueMinor,
        quantityTotal: input.quantity,
        quantityAvailable: input.quantity - taken,
        maxPerOrder: input.maxPerOrder,
        pickupStart: input.pickupStart,
        pickupEnd: input.pickupEnd,
        allergens: input.allergens,
        dietaryTags: input.dietaryTags,
        version: offer.version + 1,
      });
      refreshOfferStatus(offer, now());
      return toMerchantOffer(offer);
    },

    async setMerchantOfferPaused(id, paused) {
      const offer = ownOffer(id);
      if (offer.status === 'ENDED' || offer.status === 'REMOVED') {
        throw new ApiError('OFFER_NOT_AVAILABLE', 'Offer has ended', { status: 409 });
      }
      offer.status = paused ? 'PAUSED' : 'ACTIVE';
      if (!paused) refreshOfferStatus(offer, now());
      offer.version += 1;
      return toMerchantOffer(offer);
    },

    async endMerchantOffer(id) {
      const offer = ownOffer(id);
      offer.status = 'ENDED';
      offer.version += 1;
      return toMerchantOffer(offer);
    },

    async listMerchantOrders(locationId) {
      requireOwnerOf(findStore(locationId).businessId);
      return ordersOfStore(locationId)
        .filter((e) => ['CONFIRMED', 'READY_FOR_PICKUP', 'PICKED_UP'].includes(e.order.status))
        .sort((a, b) => Date.parse(a.order.pickup.start) - Date.parse(b.order.pickup.start))
        .map(toMerchantOrder);
    },

    async validatePickup(input, idempotencyKey) {
      requireSession(state);
      const replayKey = `pickup:${idempotencyKey}`;
      const previous = state.idempotency.get(replayKey) as PickupValidateResult | undefined;
      if (previous) return clone(previous);

      const allowedBusinesses = memberBusinessIds();
      const entry = [...state.orders.values()].find((e) => {
        const pass = e.order.pickupPass;
        if (!pass) return false;
        return 'token' in input
          ? pass.token === input.token
          : pass.code === input.code && e.order.store.id === input.locationId;
      });
      const storeBusiness = entry ? findStore(entry.order.store.id).businessId : null;
      if (!entry || !storeBusiness || !allowedBusinesses.includes(storeBusiness)) {
        throw new ApiError('PICKUP_CODE_INVALID', 'Code not recognized for this store', {
          status: 404,
        });
      }
      applyTimeTransitions(state, entry, now());
      const o = entry.order;
      if (o.status === 'PICKED_UP') {
        throw new ApiError('PICKUP_ALREADY_COMPLETED', 'Already collected', {
          status: 409,
          details: { pickedUpAt: o.pickedUpAt },
        });
      }
      if (o.status !== 'CONFIRMED' && o.status !== 'READY_FOR_PICKUP') {
        throw new ApiError('PICKUP_ORDER_CANCELLED', 'Order is not collectable', { status: 409 });
      }
      const t = now();
      if (t < Date.parse(o.pickup.start)) {
        throw new ApiError('PICKUP_NOT_YET_OPEN', 'Pickup window not open', {
          status: 409,
          details: { start: o.pickup.start },
        });
      }
      if (t > Date.parse(o.pickup.end) + NO_SHOW_GRACE_MINUTES * MINUTE) {
        throw new ApiError('PICKUP_WINDOW_CLOSED', 'Pickup window closed', { status: 409 });
      }
      transition(entry, 'PICKED_UP');
      o.pickedUpAt = iso(t);
      const result: PickupValidateResult = {
        result: 'VALIDATED',
        order: toMerchantOrder(entry),
        validatedAt: o.pickedUpAt,
      };
      state.idempotency.set(replayKey, clone(result));
      return result;
    },

    async getMerchantInsights(businessId) {
      requireOwnerOf(businessId);
      const storeIds = demoStores.filter((s) => s.businessId === businessId).map((s) => s.id);
      const orders = storeIds.flatMap(ordersOfStore);
      const completed = orders.filter((e) => e.order.status === 'PICKED_UP');
      const noShows = orders.filter((e) => e.order.status === 'NO_SHOW');
      const offers = state.offers.filter((o) => storeIds.includes(o.storeId));
      const total = offers.reduce((sum, o) => sum + o.quantityTotal, 0);
      const sold = offers.reduce((sum, o) => sum + (o.quantityTotal - o.quantityAvailable), 0);
      const settled = completed.length + noShows.length;
      const t = now();
      return {
        from: iso(t - 30 * 24 * 60 * MINUTE),
        to: iso(t),
        revenue: {
          amountMinor: completed.reduce((sum, e) => sum + e.order.breakdown.total.amountMinor, 0),
          currency: DEMO_CURRENCY,
        },
        ordersCompleted: completed.length,
        itemsRescued: completed.reduce((sum, e) => sum + e.quantity, 0),
        sellThroughRate: total > 0 ? sold / total : null,
        noShowRate: settled > 0 ? noShows.length / settled : null,
      };
    },

    async listStaff(businessId) {
      requireOwnerOf(businessId);
      return clone(state.staff);
    },

    async inviteStaff(businessId, input) {
      requireOwnerOf(businessId);
      InviteStaffRequest.parse(input);
      // Invitations are emailed by the real backend (Phase 8).
    },
  };
}
