import type { DietaryTag, OfferSort } from '@mawjood/contracts';
import { create } from 'zustand';

export type PickupDay = 'any' | 'today' | 'tomorrow';

export type ExploreFilters = {
  radiusM: number;
  categoryIds: string[];
  dietary: DietaryTag[];
  maxPriceMinor: number | null;
  availableOnly: boolean;
  minRating: number | null;
  pickupDay: PickupDay;
};

export const DEFAULT_FILTERS: ExploreFilters = {
  radiusM: 5000,
  categoryIds: [],
  dietary: [],
  maxPriceMinor: null,
  availableOnly: false,
  minRating: null,
  pickupDay: 'any',
};

type FiltersState = {
  filters: ExploreFilters;
  sort: OfferSort;
  view: 'list' | 'map';
  setFilters: (filters: ExploreFilters) => void;
  setSort: (sort: OfferSort) => void;
  setView: (view: 'list' | 'map') => void;
  reset: () => void;
};

/** Explore UI state (what the user is editing). Results always come from the server. */
export const useFilters = create<FiltersState>((set) => ({
  filters: DEFAULT_FILTERS,
  sort: 'relevance',
  view: 'list',
  setFilters: (filters) => set({ filters }),
  setSort: (sort) => set({ sort }),
  setView: (view) => set({ view }),
  reset: () => set({ filters: DEFAULT_FILTERS, sort: 'relevance' }),
}));

export function activeFilterCount(f: ExploreFilters): number {
  return (
    (f.radiusM !== DEFAULT_FILTERS.radiusM ? 1 : 0) +
    f.categoryIds.length +
    f.dietary.length +
    (f.maxPriceMinor !== null ? 1 : 0) +
    (f.availableOnly ? 1 : 0) +
    (f.minRating !== null ? 1 : 0) +
    (f.pickupDay !== 'any' ? 1 : 0)
  );
}

/** Pickup range for a relative day, as ISO strings, using the device clock. */
export function pickupRange(day: PickupDay, now: Date): { from?: string; to?: string } {
  if (day === 'any') return {};
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  if (day === 'tomorrow') start.setDate(start.getDate() + 1);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { from: start.toISOString(), to: end.toISOString() };
}
