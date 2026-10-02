import type {
  CancelOrderRequest,
  GeoPoint,
  NotificationPreferences,
  OffersQuery,
  Order,
  OrdersScope,
  ReviewRequest,
} from '@mawjood/contracts';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { newUuid } from '@/lib/ids';
import { useSession } from '@/state/session';

import { api } from './index';

/** Query keys in one place so invalidation is consistent. */
export const qk = {
  appConfig: ['app-config'] as const,
  home: (p: GeoPoint) => ['home', p.lat, p.lng] as const,
  offers: (q: OffersQuery) => ['offers', q] as const,
  offer: (id: string) => ['offer', id] as const,
  store: (id: string) => ['store', id] as const,
  search: (text: string) => ['search', text] as const,
  categories: ['categories'] as const,
  favorites: ['favorites'] as const,
  orders: (scope: OrdersScope) => ['orders', scope] as const,
  order: (id: string) => ['order', id] as const,
  quote: (offerId: string, quantity: number) => ['quote', offerId, quantity] as const,
  prefs: ['notification-preferences'] as const,
  impact: ['impact'] as const,
};

const useSignedIn = () => useSession((s) => s.status === 'signedIn');

export const useAppConfig = () =>
  useQuery({ queryKey: qk.appConfig, queryFn: () => api.getAppConfig(), staleTime: 5 * 60_000 });

export const useHomeFeed = (point: GeoPoint) =>
  useQuery({ queryKey: qk.home(point), queryFn: () => api.getHomeFeed(point) });

export const useOffers = (query: Omit<OffersQuery, 'cursor'>) =>
  useInfiniteQuery({
    queryKey: qk.offers(query),
    queryFn: ({ pageParam }) => api.listOffers({ ...query, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) =>
      last.page.hasMore ? (last.page.nextCursor ?? undefined) : undefined,
  });

export const useOffer = (id: string, near: GeoPoint | null) =>
  useQuery({
    queryKey: qk.offer(id),
    queryFn: () => api.getOffer(id, near),
    // Stock changes fast: always refetch when the screen is shown again.
    staleTime: 0,
  });

export const useStore = (id: string, near: GeoPoint | null) =>
  useQuery({
    queryKey: qk.store(id),
    queryFn: () => api.getStore(id, near),
    enabled: id.length > 0,
  });

export const useSearch = (text: string, near: GeoPoint) =>
  useQuery({
    queryKey: qk.search(text),
    queryFn: () => api.search(text, near),
    enabled: text.trim().length >= 2,
  });

export const useCategories = () =>
  useQuery({
    queryKey: qk.categories,
    queryFn: () => api.listCategories(),
    staleTime: 60 * 60_000,
  });

export const useFavorites = (near: GeoPoint | null) => {
  const signedIn = useSignedIn();
  return useQuery({
    queryKey: qk.favorites,
    queryFn: () => api.listFavorites(near),
    enabled: signedIn,
  });
};

export function useToggleFavorite() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ storeId, favorite }: { storeId: string; favorite: boolean }) =>
      favorite ? api.addFavorite(storeId) : api.removeFavorite(storeId),
    onSettled: (_data, _error, { storeId }) => {
      void client.invalidateQueries({ queryKey: qk.favorites });
      void client.invalidateQueries({ queryKey: qk.store(storeId) });
      void client.invalidateQueries({ queryKey: ['home'] });
    },
  });
}

export const useOrders = (scope: OrdersScope) => {
  const signedIn = useSignedIn();
  return useQuery({
    queryKey: qk.orders(scope),
    queryFn: () => api.listOrders(scope),
    enabled: signedIn,
  });
};

/** Order detail. Refetched on focus so status changes (e.g. picked up) show up. */
export const useOrder = (id: string) =>
  useQuery({ queryKey: qk.order(id), queryFn: () => api.getOrder(id), staleTime: 0 });

export const useQuote = (offerId: string, quantity: number, enabled: boolean) =>
  useQuery({
    queryKey: qk.quote(offerId, quantity),
    queryFn: () => api.quote({ offerId, quantity }),
    enabled,
    staleTime: 0,
    retry: false,
  });

function useInvalidateOrders() {
  const client = useQueryClient();
  return (order?: Order) => {
    void client.invalidateQueries({ queryKey: ['orders'] });
    void client.invalidateQueries({ queryKey: ['home'] });
    void client.invalidateQueries({ queryKey: qk.impact });
    if (order) {
      client.setQueryData(qk.order(order.id), order);
      const offerId = order.items[0]?.offerId;
      if (offerId) void client.invalidateQueries({ queryKey: qk.offer(offerId) });
    }
  };
}

export function useCreateOrder() {
  const invalidate = useInvalidateOrders();
  return useMutation({
    mutationFn: (v: {
      offerId: string;
      quantity: number;
      quoteVersion?: string;
      idempotencyKey: string;
    }) =>
      api.createOrder(
        { offerId: v.offerId, quantity: v.quantity, quoteVersion: v.quoteVersion },
        v.idempotencyKey,
      ),
    onSuccess: (order) => invalidate(order),
  });
}

export function useCancelOrder(id: string) {
  const invalidate = useInvalidateOrders();
  return useMutation({
    mutationFn: (input: CancelOrderRequest) => api.cancelOrder(id, input, newUuid()),
    onSuccess: (order) => invalidate(order),
  });
}

export function useReviewOrder(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: ReviewRequest) => api.reviewOrder(id, input),
    onSuccess: () => void client.invalidateQueries({ queryKey: qk.order(id) }),
  });
}

export const useNotificationPreferences = () =>
  useQuery({ queryKey: qk.prefs, queryFn: () => api.getNotificationPreferences() });

export function useUpdateNotificationPreferences() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: NotificationPreferences) => api.updateNotificationPreferences(input),
    onSuccess: (prefs) => client.setQueryData(qk.prefs, prefs),
  });
}

export const useImpact = () => {
  const signedIn = useSignedIn();
  return useQuery({ queryKey: qk.impact, queryFn: () => api.getImpact(), enabled: signedIn });
};
