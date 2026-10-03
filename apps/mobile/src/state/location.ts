import type { GeoPoint } from '@mazal/contracts';
import { create } from 'zustand';

/**
 * PLACEHOLDER: fixed list of areas until address search / geocoding is available from the API.
 * Coordinates are approximate area centers in Casablanca (assumed launch city, A2).
 */
export const MANUAL_AREAS: readonly { id: string; label: string; point: GeoPoint }[] = [
  { id: 'maarif', label: 'Maarif, Casablanca', point: { lat: 33.5826, lng: -7.6326 } },
  { id: 'gauthier', label: 'Gauthier, Casablanca', point: { lat: 33.5925, lng: -7.629 } },
  { id: 'racine', label: 'Racine, Casablanca', point: { lat: 33.589, lng: -7.643 } },
  { id: 'centre', label: 'Centre-ville, Casablanca', point: { lat: 33.5945, lng: -7.6185 } },
  { id: 'oasis', label: 'Oasis, Casablanca', point: { lat: 33.556, lng: -7.628 } },
];

export type SelectedLocation = {
  label: string;
  point: GeoPoint;
  source: 'device' | 'manual';
};

type LocationState = {
  selected: SelectedLocation;
  setSelected: (location: SelectedLocation) => void;
};

const firstArea = MANUAL_AREAS[0] ?? {
  label: 'Casablanca',
  point: { lat: 33.5731, lng: -7.5898 },
};

/** Precise device location is kept in memory only — never persisted (docs/SECURITY_MODEL.md §8). */
export const useLocationStore = create<LocationState>((set) => ({
  selected: { label: firstArea.label, point: firstArea.point, source: 'manual' },
  setSelected: (selected) => set({ selected }),
}));
