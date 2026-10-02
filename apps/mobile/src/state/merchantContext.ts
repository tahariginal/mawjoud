import type { BusinessRole, MerchantBusiness } from '@mawjood/contracts';

import { useMerchantBusinesses } from '@/api/merchantHooks';

export type MerchantContext = {
  business: MerchantBusiness;
  location: MerchantBusiness['locations'][number] | undefined;
  role: BusinessRole;
};

/**
 * Current business and location for merchant mode. MVP: the first business and its first
 * location (multi-location switching comes with Phase 8).
 */
export function useMerchantContext() {
  const query = useMerchantBusinesses();
  const business = query.data?.[0];
  const context: MerchantContext | null = business
    ? { business, location: business.locations[0], role: business.role }
    : null;
  return { ...query, context };
}
