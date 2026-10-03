import type { Category } from '@mazal/contracts';

import type { IconName } from '@/components/ui/Icon';

/** Icon shown in image placeholders for each category slug. */
const ICON_BY_SLUG: Record<string, IconName> = {
  cafe: 'cafe-outline',
  pastry: 'ice-cream-outline',
  grocery: 'nutrition-outline',
  bakery: 'restaurant-outline',
};

export const DEFAULT_CATEGORY_ICON: IconName = 'restaurant-outline';

/** Name fallbacks, for categories added later without a known slug. */
const ICON_BY_NAME: readonly [RegExp, IconName][] = [
  [/caf/i, 'cafe-outline'],
  [/p[aâ]tis|pastr/i, 'ice-cream-outline'],
  [/grocer|[ée]pic/i, 'nutrition-outline'],
];

export function categoryIcon(category: Pick<Category, 'slug' | 'name'> | undefined): IconName {
  if (!category) return DEFAULT_CATEGORY_ICON;
  const bySlug = ICON_BY_SLUG[category.slug];
  if (bySlug) return bySlug;
  return (
    ICON_BY_NAME.find(([pattern]) => pattern.test(category.name))?.[1] ?? DEFAULT_CATEGORY_ICON
  );
}

/**
 * Up to two initials from a store name, skipping lowercase particles
 * ("Fournil des Oliviers" → "FO", "Café Zellige" → "CZ").
 */
export function storeInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const significant = words.filter((w) => /^[\p{Lu}\p{N}]/u.test(w));
  const picked = (significant.length > 0 ? significant : words).slice(0, 2);
  return picked
    .map((w) => Array.from(w)[0] ?? '')
    .join('')
    .toLocaleUpperCase();
}
