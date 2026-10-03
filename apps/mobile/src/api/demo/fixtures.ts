/**
 * DEMO DATA — development only. Fictional businesses in Casablanca used by the demo adapter
 * until the Mazal API exists. Never shipped to production (see src/config/env.ts).
 */
import type {
  Allergen,
  BusinessHours,
  Category,
  DietaryTag,
  ImageSet,
  StoreDetail,
} from '@mazal/contracts';

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

/**
 * Demo photos from Pexels (https://www.pexels.com/license/ — free to use, no attribution
 * required), loaded from images.pexels.com in demo mode only. Each id was checked to show
 * the food it illustrates.
 */
export function pexels(photoId: number): ImageSet {
  const url = (width: number) =>
    `https://images.pexels.com/photos/${photoId}/pexels-photo-${photoId}.jpeg?auto=compress&cs=tinysrgb&w=${width}`;
  return { thumbUrl: url(400), mediumUrl: url(800), largeUrl: url(1400), blurhash: null };
}

const store = (
  n: number,
  name: string,
  categoryId: string,
  line1: string,
  lat: number,
  lng: number,
  rating: StoreDetail['rating'],
  description: string,
  photo: number,
): DemoStoreSeed => ({
  id: id(0x200 + n),
  businessId: id(0x300 + n),
  name,
  categoryId,
  logo: pexels(photo),
  cover: pexels(photo),
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
    15965547,
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
    5018373,
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
    3639538,
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
    12708049,
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
    23025176,
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
    10819659,
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
    27926903,
  ),
  store(
    8,
    'Boulangerie Al Firdaous',
    CATEGORY_IDS.bakery,
    'Boulevard Rachidi, Gauthier',
    33.5915,
    -7.6262,
    { average: 4.5, count: 64 },
    'Wood-fired bread, khobz and baguettes all day.',
    20149452,
  ),
  store(
    9,
    'Dar Msemen',
    CATEGORY_IDS.bakery,
    'Rue Abou Bakr El Kadiri, Maarif',
    33.579,
    -7.629,
    { average: 4.7, count: 152 },
    'Msemen, harcha and baghrir made by hand every morning.',
    30323519,
  ),
  store(
    10,
    'Pizzeria Corniche',
    CATEGORY_IDS.restaurant,
    'Boulevard de la Corniche, Aïn Diab',
    33.5935,
    -7.6655,
    { average: 4.2, count: 73 },
    'Stone-baked pizzas by the slice or whole.',
    33987719,
  ),
  store(
    11,
    'Green Bowl',
    CATEGORY_IDS.restaurant,
    'Rue Jean Jaurès, Racine',
    33.5875,
    -7.6402,
    null,
    'New: salad bowls and fresh juices, made to order.',
    10665501,
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
  image: ImageSet | null;
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
    image: pexels(1871024),
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
    image: pexels(15029880),
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
    image: pexels(31101247),
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
    image: pexels(1093837),
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
    image: pexels(30068444),
  },
  {
    id: id(0x406),
    storeIndex: 5,
    title: 'Almond pastry box',
    description: 'Chebakia, ghriba and almond briouates from today.',
    contentsNote: null,
    priceMinor: 4000,
    referenceMinor: null,
    quantity: 5,
    maxPerOrder: 2,
    startInMin: 24 * 60 + 60,
    durationMin: 60,
    allergens: ['TREE_NUTS', 'GLUTEN'],
    dietaryTags: ['VEGETARIAN'],
    image: pexels(30068451),
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
    image: pexels(868110),
  },
  {
    id: id(0x408),
    storeIndex: 0,
    title: 'Croissant & brioche bag',
    description: 'Croissants, pains au chocolat and brioche from this morning.',
    contentsNote: 'Usually 4–6 pieces.',
    priceMinor: 2500,
    referenceMinor: 6500,
    quantity: 2,
    maxPerOrder: 1,
    startInMin: 20,
    durationMin: 90,
    allergens: ['GLUTEN', 'MILK', 'EGGS'],
    dietaryTags: ['VEGETARIAN'],
    image: pexels(19803486),
  },
  {
    id: id(0x409),
    storeIndex: 2,
    title: 'Cakes & dessert plates',
    description: 'Slices of today’s cakes and plated desserts.',
    contentsNote: null,
    priceMinor: 5500,
    referenceMinor: 14000,
    quantity: 3,
    maxPerOrder: 1,
    startInMin: 24 * 60 + 90,
    durationMin: 60,
    allergens: ['GLUTEN', 'MILK', 'EGGS', 'TREE_NUTS'],
    dietaryTags: ['VEGETARIAN'],
    image: pexels(1448721),
  },
  {
    id: id(0x40a),
    storeIndex: 7,
    title: 'Bread bag of the day',
    description: 'Khobz, baguettes and country loaves left at closing.',
    contentsNote: 'About 1.5 kg.',
    priceMinor: 2000,
    referenceMinor: 5000,
    quantity: 7,
    maxPerOrder: 2,
    startInMin: 45,
    durationMin: 75,
    allergens: ['GLUTEN'],
    dietaryTags: ['VEGAN'],
    image: pexels(9120377),
  },
  {
    id: id(0x40b),
    storeIndex: 8,
    title: 'Msemen & harcha bag',
    description: 'Msemen, harcha and baghrir from the morning batch.',
    contentsNote: 'Great with honey and amlou.',
    priceMinor: 1500,
    referenceMinor: 4000,
    quantity: 3,
    maxPerOrder: 2,
    startInMin: -30,
    durationMin: 150,
    allergens: ['GLUTEN', 'MILK'],
    dietaryTags: ['VEGETARIAN', 'HALAL'],
    image: pexels(30323513),
  },
  {
    id: id(0x40c),
    storeIndex: 9,
    title: 'Pizza slices box',
    description: 'Assorted slices from today’s pizzas.',
    contentsNote: 'Usually 4 slices.',
    priceMinor: 4500,
    referenceMinor: 11000,
    quantity: 4,
    maxPerOrder: 2,
    startInMin: 150,
    durationMin: 90,
    allergens: ['GLUTEN', 'MILK'],
    dietaryTags: [],
    image: pexels(5848281),
  },
  {
    id: id(0x40d),
    storeIndex: 10,
    title: 'Salad bowls',
    description: 'Fresh salad bowls prepared today, dressing on the side.',
    contentsNote: null,
    priceMinor: 3000,
    referenceMinor: 6500,
    quantity: 5,
    maxPerOrder: 2,
    startInMin: -15,
    durationMin: 105,
    allergens: ['MUSTARD', 'SESAME'],
    dietaryTags: ['VEGETARIAN'],
    image: pexels(842545),
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
