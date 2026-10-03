import type { OfferSummary } from '@mazal/contracts';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { OfferCard } from './OfferCard';
import { discountPercent, PriceTag } from './Price';
import { EmptyState } from './ui/StateViews';

const offer: OfferSummary = {
  id: '00000000-0000-4000-8000-000000000401',
  title: 'Assorted pastries',
  store: {
    id: '00000000-0000-4000-8000-000000000201',
    name: 'Fournil des Oliviers',
    logo: null,
    location: { lat: 33.58, lng: -7.63 },
  },
  categoryId: '00000000-0000-4000-8000-000000000101',
  image: null,
  price: { amountMinor: 3500, currency: 'MAD' },
  referenceValue: { amountMinor: 9000, currency: 'MAD' },
  pickup: {
    start: new Date(Date.now() + 3_600_000).toISOString(),
    end: new Date(Date.now() + 7_200_000).toISOString(),
    timezone: 'Africa/Casablanca',
  },
  quantityAvailable: 2,
  status: 'ACTIVE',
  distanceM: 820,
  rating: null,
};

describe('OfferCard', () => {
  it('shows what, where, when and how much', async () => {
    await render(<OfferCard offer={offer} />);
    expect(screen.getByText('Assorted pastries')).toBeTruthy();
    expect(screen.getByText('Fournil des Oliviers')).toBeTruthy();
    expect(screen.getByText(/820 m/)).toBeTruthy();
    expect(screen.getByText('2 left')).toBeTruthy();
  });

  it('marks sold-out offers with text, not only color', async () => {
    await render(<OfferCard offer={{ ...offer, quantityAvailable: 0, status: 'SOLD_OUT' }} />);
    expect(screen.getByText('Sold out')).toBeTruthy();
  });
});

describe('PriceTag', () => {
  it('announces price and usual value for screen readers', async () => {
    await render(<PriceTag price={offer.price} referenceValue={offer.referenceValue} />);
    const label = screen.getByLabelText(/usually/);
    expect(label).toBeTruthy();
  });

  it('shows the discount against the usual value as a percentage', async () => {
    await render(<PriceTag price={offer.price} referenceValue={offer.referenceValue} />);
    expect(screen.getByText('-61%')).toBeTruthy();
    expect(screen.getByLabelText(/61% off/)).toBeTruthy();
  });

  it('has no discount without a higher usual value', () => {
    expect(discountPercent(offer.price, null)).toBeNull();
    expect(discountPercent(offer.price, offer.price)).toBeNull();
  });
});

describe('EmptyState', () => {
  it('renders an action that can be pressed', async () => {
    const onAction = jest.fn();
    await render(
      <EmptyState
        title="Nothing nearby right now."
        actionLabel="Clear filters"
        onAction={onAction}
      />,
    );
    await fireEvent.press(screen.getByText('Clear filters'));
    expect(onAction).toHaveBeenCalledTimes(1);
  });
});
