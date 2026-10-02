import {
  ApiErrorEnvelope,
  AppConfig,
  AuthResponse,
  AuthTokens,
  Category,
  CreateOrderResponse,
  FavoriteStore,
  HomeFeed,
  ImpactSummary,
  Me,
  MerchantBusiness,
  MerchantInsights,
  MerchantOffer,
  MerchantOrder,
  NotificationPreferences,
  OfferDetail,
  OfferSummary,
  Order,
  PickupValidateResult,
  Quote,
  SearchResults,
  StaffMember,
  StorePage,
  pageOf,
  type GeoPoint,
  type OffersQuery,
} from '@mawjood/contracts';
import { Platform } from 'react-native';
import { z } from 'zod';

import { env } from '@/config/env';
import { newUuid } from '@/lib/ids';

import { ApiError } from './errors';
import { tokenStorage } from './tokenStorage';
import type { AuthResult, MawjoodApi } from './types';

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
type QueryValue = string | number | boolean | undefined;

type RequestOptions = {
  body?: unknown;
  query?: Record<string, QueryValue>;
  idempotencyKey?: string;
  /** Attach the access token. Defaults to true. */
  auth?: boolean;
  timeoutMs?: number;
};

const DEFAULT_TIMEOUT_MS = 10_000;
const CHECKOUT_TIMEOUT_MS = 20_000;

const OfferPage = pageOf(OfferSummary);
const OrderPage = pageOf(Order);
const CategoryList = z.array(Category);
const FavoriteList = z.array(FavoriteStore);
const MerchantBusinessList = z.array(MerchantBusiness);
const MerchantOfferList = z.array(MerchantOffer);
const MerchantOrderList = z.array(MerchantOrder);
const StaffList = z.array(StaffMember);

function point(near: GeoPoint | null): Record<string, QueryValue> {
  return near ? { lat: near.lat, lng: near.lng } : {};
}

function offersQueryParams(q: OffersQuery): Record<string, QueryValue> {
  return {
    ...point(q.near ?? null),
    radiusM: q.radiusM,
    bbox: q.bbox
      ? [q.bbox.minLng, q.bbox.minLat, q.bbox.maxLng, q.bbox.maxLat].join(',')
      : undefined,
    categoryIds: q.categoryIds?.join(','),
    dietary: q.dietary?.join(','),
    maxPriceMinor: q.maxPriceMinor,
    pickupFrom: q.pickupFrom,
    pickupTo: q.pickupTo,
    availableOnly: q.availableOnly,
    minRating: q.minRating,
    sort: q.sort,
    cursor: q.cursor,
    limit: q.limit,
  };
}

function buildUrl(baseUrl: string, path: string, query?: Record<string, QueryValue>): string {
  const params = Object.entries(query ?? {})
    .filter((entry): entry is [string, string | number | boolean] => entry[1] !== undefined)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  return `${baseUrl}${path}${params.length > 0 ? `?${params.join('&')}` : ''}`;
}

/** Real REST client for /api/v1 (docs/API_SPECIFICATION.md). */
export function createHttpApi(baseUrl: string): MawjoodApi {
  let accessToken: string | null = null;
  let refreshInFlight: Promise<boolean> | null = null;

  async function storeTokens(tokens: AuthTokens): Promise<void> {
    accessToken = tokens.accessToken;
    await tokenStorage.setRefreshToken(tokens.refreshToken);
  }

  async function clearTokens(): Promise<void> {
    accessToken = null;
    await tokenStorage.clear();
  }

  /** Single-flight refresh: concurrent 401s share one refresh call. */
  function refreshTokens(): Promise<boolean> {
    if (!refreshInFlight) {
      refreshInFlight = (async () => {
        const refreshToken = await tokenStorage.getRefreshToken();
        if (!refreshToken) return false;
        try {
          const tokens = await send('POST', '/auth/refresh', AuthTokens, {
            body: { refreshToken },
            auth: false,
          });
          await storeTokens(tokens);
          return true;
        } catch {
          await clearTokens();
          return false;
        }
      })().finally(() => {
        refreshInFlight = null;
      });
    }
    return refreshInFlight;
  }

  async function rawFetch(
    method: Method,
    path: string,
    options: RequestOptions,
  ): Promise<Response> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'X-Request-Id': newUuid(),
      'X-App-Version': env.appVersion,
      'X-Platform': Platform.OS,
    };
    if (options.body !== undefined) headers['Content-Type'] = 'application/json';
    if (options.idempotencyKey) headers['Idempotency-Key'] = options.idempotencyKey;
    if (options.auth !== false && accessToken) headers.Authorization = `Bearer ${accessToken}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
    try {
      return await fetch(buildUrl(baseUrl, path, options.query), {
        method,
        headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        signal: controller.signal,
      });
    } catch (error) {
      if (controller.signal.aborted) throw new ApiError('TIMEOUT', 'Request timed out');
      throw new ApiError('NETWORK_ERROR', error instanceof Error ? error.message : 'Network error');
    } finally {
      clearTimeout(timer);
    }
  }

  async function toApiError(response: Response): Promise<ApiError> {
    let json: unknown = null;
    try {
      json = await response.json();
    } catch {
      // Non-JSON error body (proxy, gateway). Fall through to a generic error.
    }
    const parsed = ApiErrorEnvelope.safeParse(json);
    if (parsed.success) {
      const { code, message, requestId, details } = parsed.data.error;
      return new ApiError(code, message, { status: response.status, requestId, details });
    }
    return new ApiError(
      response.status >= 500 ? 'SERVICE_UNAVAILABLE' : 'UNEXPECTED_RESPONSE',
      `HTTP ${response.status}`,
      { status: response.status },
    );
  }

  async function sendRaw(
    method: Method,
    path: string,
    options: RequestOptions,
    isRetry = false,
  ): Promise<Response> {
    const response = await rawFetch(method, path, options);
    if (response.ok) return response;

    const error = await toApiError(response);
    if (error.code === 'AUTH_TOKEN_EXPIRED' && options.auth !== false && !isRetry) {
      if (await refreshTokens()) return sendRaw(method, path, options, true);
    }
    throw error;
  }

  async function send<T>(
    method: Method,
    path: string,
    schema: z.ZodType<T>,
    options: RequestOptions = {},
  ): Promise<T> {
    const response = await sendRaw(method, path, options);
    const json: unknown = await response.json().catch(() => null);
    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      throw new ApiError(
        'UNEXPECTED_RESPONSE',
        `Response for ${method} ${path} did not match contract`,
      );
    }
    return parsed.data;
  }

  async function sendVoid(
    method: Method,
    path: string,
    options: RequestOptions = {},
  ): Promise<void> {
    await sendRaw(method, path, options);
  }

  async function authenticate(path: string, body: unknown): Promise<AuthResult> {
    const result = await send('POST', path, AuthResponse, { body, auth: false });
    await storeTokens(result.tokens);
    return result;
  }

  return {
    mode: 'http',

    getAppConfig: () => send('GET', '/app-config', AppConfig, { auth: false }),

    async restoreSession() {
      if (!(await refreshTokens())) return null;
      try {
        return await send('GET', '/me', Me);
      } catch {
        await clearTokens();
        return null;
      }
    },
    register: (input) => authenticate('/auth/register', input),
    login: (input) => authenticate('/auth/login', input),
    async logout() {
      try {
        await sendVoid('POST', '/auth/logout');
      } finally {
        await clearTokens();
      }
    },
    verifyEmail: (input) => send('POST', '/auth/email/verify', Me, { body: input }),
    resendVerification: () => sendVoid('POST', '/auth/email/resend'),
    forgotPassword: (input) =>
      sendVoid('POST', '/auth/password/forgot', { body: input, auth: false }),
    resetPassword: (input) =>
      sendVoid('POST', '/auth/password/reset', { body: input, auth: false }),
    updateMe: (input) => send('PATCH', '/me', Me, { body: input }),
    async deleteAccount(input) {
      await sendVoid('DELETE', '/me', { body: input });
      await clearTokens();
    },

    getHomeFeed: (near) => send('GET', '/feed/home', HomeFeed, { query: point(near) }),
    listOffers: (query) => send('GET', '/offers', OfferPage, { query: offersQueryParams(query) }),
    getOffer: (id, near) =>
      send('GET', `/offers/${encodeURIComponent(id)}`, OfferDetail, { query: point(near) }),
    getStore: (id, near) =>
      send('GET', `/stores/${encodeURIComponent(id)}`, StorePage, { query: point(near) }),
    search: (text, near) =>
      send('GET', '/search', SearchResults, { query: { q: text, ...point(near) } }),
    listCategories: () => send('GET', '/categories', CategoryList, { auth: false }),

    listFavorites: (near) => send('GET', '/favorites', FavoriteList, { query: point(near) }),
    addFavorite: (storeId) => sendVoid('PUT', `/favorites/stores/${encodeURIComponent(storeId)}`),
    removeFavorite: (storeId) =>
      sendVoid('DELETE', `/favorites/stores/${encodeURIComponent(storeId)}`),

    quote: (input) => send('POST', '/orders/quote', Quote, { body: input }),
    createOrder: (input, idempotencyKey) =>
      send('POST', '/orders', CreateOrderResponse, {
        body: input,
        idempotencyKey,
        timeoutMs: CHECKOUT_TIMEOUT_MS,
      }),
    resumePayment: (orderId, idempotencyKey) =>
      send('POST', `/orders/${encodeURIComponent(orderId)}/payment`, CreateOrderResponse, {
        idempotencyKey,
        timeoutMs: CHECKOUT_TIMEOUT_MS,
      }),
    listOrders: (scope, cursor) =>
      send('GET', '/orders', OrderPage, { query: { status: scope, cursor } }),
    getOrder: (id) => send('GET', `/orders/${encodeURIComponent(id)}`, Order),
    cancelOrder: (id, input, idempotencyKey) =>
      send('POST', `/orders/${encodeURIComponent(id)}/cancel`, Order, {
        body: input,
        idempotencyKey,
      }),
    reviewOrder: (id, input) =>
      sendVoid('POST', `/orders/${encodeURIComponent(id)}/review`, { body: input }),
    simulateDevPayment: () =>
      Promise.reject(
        new ApiError('NOT_AVAILABLE_YET', 'Payment simulator exists only in demo mode'),
      ),

    getNotificationPreferences: () =>
      send('GET', '/me/notification-preferences', NotificationPreferences),
    updateNotificationPreferences: (input) =>
      send('PUT', '/me/notification-preferences', NotificationPreferences, { body: input }),
    getImpact: () => send('GET', '/me/impact', ImpactSummary),

    submitMerchantApplication: (input) =>
      sendVoid('POST', '/merchant/applications', { body: input }),
    listMerchantBusinesses: () => send('GET', '/merchant/businesses', MerchantBusinessList),
    listMerchantOffers: (businessId) =>
      send('GET', '/merchant/offers', MerchantOfferList, { query: { businessId } }),
    getMerchantOffer: (id) =>
      send('GET', `/merchant/offers/${encodeURIComponent(id)}`, MerchantOffer),
    createMerchantOffer: (input) =>
      send('POST', '/merchant/offers', MerchantOffer, { body: input }),
    updateMerchantOffer: (id, input, version) =>
      send('PATCH', `/merchant/offers/${encodeURIComponent(id)}`, MerchantOffer, {
        body: { ...input, version },
      }),
    setMerchantOfferPaused: (id, paused) =>
      send(
        'POST',
        `/merchant/offers/${encodeURIComponent(id)}/${paused ? 'pause' : 'resume'}`,
        MerchantOffer,
      ),
    endMerchantOffer: (id) =>
      send('POST', `/merchant/offers/${encodeURIComponent(id)}/end`, MerchantOffer),
    listMerchantOrders: (locationId) =>
      send('GET', '/merchant/orders', MerchantOrderList, { query: { locationId } }),
    validatePickup: (input, idempotencyKey) =>
      send('POST', '/pickups/validate', PickupValidateResult, { body: input, idempotencyKey }),
    getMerchantInsights: (businessId) =>
      send('GET', '/merchant/insights', MerchantInsights, { query: { businessId } }),
    listStaff: (businessId) =>
      send('GET', `/merchant/businesses/${encodeURIComponent(businessId)}/members`, StaffList),
    inviteStaff: (businessId, input) =>
      sendVoid('POST', `/merchant/businesses/${encodeURIComponent(businessId)}/members`, {
        body: input,
      }),
  };
}
