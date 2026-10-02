import { categoryIcon, DEFAULT_CATEGORY_ICON, storeInitials } from './categoryIcon';

describe('storeInitials', () => {
  it('uses the first letters of capitalized words, skipping particles', () => {
    expect(storeInitials('Fournil des Oliviers')).toBe('FO');
    expect(storeInitials('Café Zellige')).toBe('CZ');
    expect(storeInitials('Verdure Épicerie')).toBe('VÉ');
  });

  it('falls back to the first word when nothing is capitalized', () => {
    expect(storeInitials('  boulangerie du coin ')).toBe('BD');
    expect(storeInitials('nour')).toBe('N');
  });
});

describe('categoryIcon', () => {
  it('maps known slugs', () => {
    expect(categoryIcon({ slug: 'cafe', name: 'Café' })).toBe('cafe-outline');
    expect(categoryIcon({ slug: 'pastry', name: 'Pastry' })).toBe('ice-cream-outline');
    expect(categoryIcon({ slug: 'grocery', name: 'Grocery' })).toBe('nutrition-outline');
    expect(categoryIcon({ slug: 'bakery', name: 'Bakery' })).toBe('restaurant-outline');
  });

  it('falls back on the name, then on a generic icon', () => {
    expect(categoryIcon({ slug: 'fine-food', name: 'Épicerie fine' })).toBe('nutrition-outline');
    expect(categoryIcon({ slug: 'restaurant', name: 'Restaurant' })).toBe(DEFAULT_CATEGORY_ICON);
    expect(categoryIcon(undefined)).toBe(DEFAULT_CATEGORY_ICON);
  });
});
