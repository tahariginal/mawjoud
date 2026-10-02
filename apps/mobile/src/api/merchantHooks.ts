import type {
  InviteStaffRequest,
  MerchantApplicationRequest,
  MerchantOfferInput,
  PickupValidateRequest,
} from '@mawjood/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { newUuid } from '@/lib/ids';

import { api } from './index';

export const mqk = {
  businesses: ['merchant', 'businesses'] as const,
  offers: (businessId: string) => ['merchant', 'offers', businessId] as const,
  offer: (id: string) => ['merchant', 'offer', id] as const,
  orders: (locationId: string) => ['merchant', 'orders', locationId] as const,
  insights: (businessId: string) => ['merchant', 'insights', businessId] as const,
  staff: (businessId: string) => ['merchant', 'staff', businessId] as const,
};

export const useMerchantBusinesses = () =>
  useQuery({ queryKey: mqk.businesses, queryFn: () => api.listMerchantBusinesses() });

export const useMerchantOffers = (businessId: string | undefined) =>
  useQuery({
    queryKey: mqk.offers(businessId ?? ''),
    queryFn: () => api.listMerchantOffers(businessId ?? ''),
    enabled: !!businessId,
  });

export const useMerchantOffer = (id: string | undefined) =>
  useQuery({
    queryKey: mqk.offer(id ?? ''),
    queryFn: () => api.getMerchantOffer(id ?? ''),
    enabled: !!id,
  });

export const useMerchantOrders = (locationId: string | undefined) =>
  useQuery({
    queryKey: mqk.orders(locationId ?? ''),
    queryFn: () => api.listMerchantOrders(locationId ?? ''),
    enabled: !!locationId,
    refetchInterval: 30_000,
  });

export const useMerchantInsights = (businessId: string | undefined) =>
  useQuery({
    queryKey: mqk.insights(businessId ?? ''),
    queryFn: () => api.getMerchantInsights(businessId ?? ''),
    enabled: !!businessId,
  });

export const useStaff = (businessId: string | undefined) =>
  useQuery({
    queryKey: mqk.staff(businessId ?? ''),
    queryFn: () => api.listStaff(businessId ?? ''),
    enabled: !!businessId,
  });

function useInvalidateMerchant() {
  const client = useQueryClient();
  return () => {
    void client.invalidateQueries({ queryKey: ['merchant'] });
    // Customer-facing feeds show merchant offers too.
    void client.invalidateQueries({ queryKey: ['home'] });
    void client.invalidateQueries({ queryKey: ['offers'] });
  };
}

export function useSaveMerchantOffer() {
  const invalidate = useInvalidateMerchant();
  return useMutation({
    mutationFn: (v: { id?: string; version?: number; input: MerchantOfferInput }) =>
      v.id !== undefined && v.version !== undefined
        ? api.updateMerchantOffer(v.id, v.input, v.version)
        : api.createMerchantOffer(v.input),
    onSuccess: invalidate,
  });
}

export function useOfferLifecycle() {
  const invalidate = useInvalidateMerchant();
  return useMutation({
    mutationFn: (v: { id: string; action: 'pause' | 'resume' | 'end' }) =>
      v.action === 'end'
        ? api.endMerchantOffer(v.id)
        : api.setMerchantOfferPaused(v.id, v.action === 'pause'),
    onSuccess: invalidate,
  });
}

export function useValidatePickup() {
  const invalidate = useInvalidateMerchant();
  return useMutation({
    // A fresh key per scan; a network retry of the same scan reuses it via `retryKey`.
    mutationFn: (v: { input: PickupValidateRequest; idempotencyKey?: string }) =>
      api.validatePickup(v.input, v.idempotencyKey ?? newUuid()),
    onSuccess: invalidate,
  });
}

export function useInviteStaff(businessId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: InviteStaffRequest) => api.inviteStaff(businessId, input),
    onSuccess: () => void client.invalidateQueries({ queryKey: mqk.staff(businessId) }),
  });
}

export const useSubmitApplication = () =>
  useMutation({
    mutationFn: (input: MerchantApplicationRequest) => api.submitMerchantApplication(input),
  });
