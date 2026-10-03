/**
 * DEMO DATA — development only. Fictional businesses in Casablanca used by the demo adapter
 * until the Mazal API exists. Never shipped to production (see src/config/env.ts).
 */
import type { Allergen, BusinessHours, Category, DietaryTag, StoreDetail } from '@mazal/contracts';

export const DEMO_TIMEZONE = 'Africa/Casablanca';
export const DEMO_CURRENCY = 'MAD';

/** Default "manual" location: Maarif, Casablanca. */
export const DEMO_DEFAULT_POINT = { lat: 33.5826, lng: -7.6326 };

const id = (n: number) => `00000000-0000-4000-8000-${n.toString(16).padStart(12, '0')}`;

export const CATEGORY_IDS = {
  bakery: id(0x101),
  cafe: id(0x102),
  restaurant: id(0x103),
  grocery: id(0x104),
  pastry: id(0x105),
} as const;

export const demoCategories: Category[] = [
  { id: CATEGORY_IDS.bakery, slug: 'bakery', name: 'Bakery' },
  { id: CATEGORY_IDS.pastry, slug: 'pastry', name: 'Pastry' },
  { id: CATEGORY_IDS.cafe, slug: 'cafe', name: 'Café' },
  { id: CATEGORY_IDS.restaurant, slug: 'restaurant', name: 'Restaurant' },
  { id: CATEGORY_IDS.grocery, slug: 'grocery', name: 'Grocery' },
];

const weekHours = (opensAt: string, closesAt: string): BusinessHours[] =>
  [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, opensAt, closesAt }));

type DemoStoreSeed = Omit<StoreDetail, 'distanceM' | 'hasOffersNow'>;

const store = (
  n: number,
  name: string,
  categoryId: string,
  line1: string,
  lat: number,
  lng: number,
  rating: StoreDetail['rating'],
  description: string,
): DemoStoreSeed => ({
  id: id(0x200 + n),
  businessId: id(0x300 + n),
  name,
  categoryId,
  logo: null,
  cover: null,
  address: { line1, city: 'Casablanca', postalCode: null, countryCode: 'MA' },
  location: { lat, lng },
  rating,
  timezone: DEMO_TIMEZONE,
  description,
  phone: null,
  hours: weekHours('07:30', '21:00'),
});

export const demoStores: DemoStoreSeed[] = [
  store(
    1,
    'Fournil des Oliviers',
    CATEGORY_IDS.bakery,
    'Rue du Parc, Maarif',
    33.5841,
    -7.6338,
    { average: 4.6, count: 128 },
    'Sourdough, baguettes and viennoiseries baked every morning.',
  ),
  store(
    2,
    'Café Zellige',
    CATEGORY_IDS.cafe,
    'Boulevard Zerktouni',
    33.5878,
    -7.6295,
    { average: 4.3, count: 86 },
    'Coffee, sandwiches and salads made in-house.',
  ),
  store(
    3,
    'Pâtisserie Nour',
    CATEGORY_IDS.pastry,
    'Rue Ibnou Mounir, Maarif',
    33.5802,
    -7.6371,
    { average: 4.8, count: 211 },
    'Moroccan and French pastries.',
  ),
  store(
    4,
    'Verdure Épicerie',
    CATEGORY_IDS.grocery,
    'Quartier Gauthier',
    33.5931,
    -7.6283,
    { average: 4.1, count: 42 },
    'Fruit, vegetables and pantry staples.',
  ),
  store(
    5,
    'Tajine & Co',
    CATEGORY_IDS.restaurant,
    'Boulevard d’Anfa',
    33.5899,
    -7.6412,
    { average: 4.4, count: 97 },
    'Home-style tajines and couscous.',
  ),
  store(
    6,
    'Maison Amande',
    CATEGORY_IDS.pastry,
    'Racine',
    33.5893,
    -7.6449,
    null,
    'New in the neighbourhood: almond-based pastries.',
  ),
  store(
    7,
    'Marché Frais Oasis',
    CATEGORY_IDS.grocery,
    'Oasis',
    33.5562,
    -7.6281,
    { average: 3.9, count: 23 },
    'Neighbourhood market with daily produce.',
  ),
];

export type DemoOfferSeed = {
  id: string;
  storeIndex: number;
  title: string;
  description: string;
  contentsNote: string | null;
  priceMinor: number;
  referenceMinor: number | null;
  quantity: number;
  maxPerOrder: number;
  /** Pickup window relative to "now", in minutes. */
  startInMin: number;
  durationMin: number;
  allergens: Allergen[];
  dietaryTags: DietaryTag[];
};

export const demoOfferSeeds: DemoOfferSeed[] = [
  {
    id: id(0x401),
    storeIndex: 0,
    title: 'Assorted bread & viennoiseries',
    description: 'A mix of today’s unsold bread and viennoiseries.',
    contentsNote: 'Contents vary with what is left at closing.',
    priceMinor: 3500,
    referenceMinor: 9000,
    quantity: 4,
    maxPerOrder: 2,
    startInMin: 60,
    durationMin: 60,
    allergens: ['GLUTEN', 'MILK', 'EGGS'],
    dietaryTags: ['VEGETARIAN'],
  },
  {
    id: id(0x402),
    storeIndex: 1,
    title: 'Sandwich & salad box',
    description: 'Sandwiches and salads prepared today.',
    contentsNote: 'Usually 2–3 items.',
    priceMinor: 4000,
    referenceMinor: 10000,
    quantity: 3,
    maxPerOrder: 1,
    startInMin: 30,
    durationMin: 90,
    allergens: ['GLUTEN', 'MUSTARD'],
    dietaryTags: [],
  },
  {
    id: id(0x403),
    storeIndex: 2,
    title: 'Pastry selection',
    description: 'Moroccan and French pastries from today.',
    contentsNote: null,
    priceMinor: 4500,
    referenceMinor: 12000,
    quantity: 1,
    maxPerOrder: 1,
    startInMin: 120,
    durationMin: 60,
    allergens: ['GLUTEN', 'TREE_NUTS', 'MILK', 'EGGS'],
    dietaryTags: ['VEGETARIAN'],
  },
  {
    id: id(0x404),
    storeIndex: 3,
    title: 'Fruit & vegetable basket',
    description: 'Seasonal produce that is still good but no longer perfect-looking.',
    contentsNote: 'About 3 kg.',
    priceMinor: 3000,
    referenceMinor: 7500,
    quantity: 6,
    maxPerOrder: 2,
    startInMin: 180,
    durationMin: 120,
    allergens: [],
    dietaryTags: ['VEGAN', 'GLUTEN_FREE'],
  },
  {
    id: id(0x405),
    storeIndex: 4,
    title: 'Tajine of the day',
    description: 'Portions from today’s tajine.',
    contentsNote: 'Bring your own container if you can.',
    priceMinor: 5000,
    referenceMinor: 11000,
    quantity: 0,
    maxPerOrder: 2,
    startInMin: 90,
    durationMin: 60,
    allergens: ['CELERY'],
    dietaryTags: ['HALAL'],
  },
  {
    id: id(0x406),
    storeIndex: 5,
    title: 'Almond pastry box',
    description: 'Almond briouates and cornes de gazelle.',
    contentsNote: null,
    priceMinor: 4000,
    referenceMinor: null,
    quantity: 5,
    maxPerOrder: 2,
    startInMin: 24 * 60 + 60,
    durationMin: 60,
    allergens: ['TREE_NUTS', 'GLUTEN'],
    dietaryTags: ['VEGETARIAN'],
  },
  {
    id: id(0x407),
    storeIndex: 6,
    title: 'Market surprise basket',
    description: 'Mixed groceries close to their best-before date.',
    contentsNote: null,
    priceMinor: 3500,
    referenceMinor: 8000,
    quantity: 8,
    maxPerOrder: 3,
    startInMin: 240,
    durationMin: 90,
    allergens: [],
    dietaryTags: [],
  },
];

export const DEMO_TERMS =
  'Contents may vary depending on what is left at the end of the day. Allergen information is provided by the store; ask staff if you have a severe allergy. Final legal terms are pending review.';

/** Demo merchant: the signed-in demo user owns this store. */
export const DEMO_MERCHANT_STORE_INDEX = 0;

export const demoUserId = id(0x501);

/** Codes for seeded orders at the demo merchant store, so scanning can be tried. */
export const DEMO_SEEDED_PICKUP_CODES = ['K7Q9MZ', 'P3XH8T'] as const;

export const demoIds = { id };
