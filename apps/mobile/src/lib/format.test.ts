import {
  formatDistance,
  formatMoney,
  formatTime,
  pickupPhase,
  pickupWindowParts,
  relativeDay,
  savingsOf,
} from './format';

const MAD = (amountMinor: number) => ({ amountMinor, currency: 'MAD' });
const TZ = 'Africa/Casablanca';

describe('formatMoney', () => {
  it('formats whole amounts without decimals and keeps cents when present', () => {
    expect(formatMoney(MAD(3500), 'en')).toContain('35');
    expect(formatMoney(MAD(3500), 'en')).not.toContain('35.00');
    expect(formatMoney(MAD(3550), 'en')).toContain('35.50');
    expect(formatMoney(MAD(3500), 'en')).toContain('MAD');
  });
});

describe('savingsOf', () => {
  it('returns the difference when the reference value is higher', () => {
    expect(savingsOf(MAD(3500), MAD(9000))).toEqual(MAD(5500));
  });
  it('returns null without a reference, with a lower reference, or with another currency', () => {
    expect(savingsOf(MAD(3500), null)).toBeNull();
    expect(savingsOf(MAD(3500), MAD(3000))).toBeNull();
    expect(savingsOf(MAD(3500), { amountMinor: 9000, currency: 'EUR' })).toBeNull();
  });
});

describe('formatDistance', () => {
  it('uses meters below 1 km and kilometers above', () => {
    expect(formatDistance(640, 'en')).toBe('640 m');
    expect(formatDistance(1234, 'en')).toBe('1.2 km');
    expect(formatDistance(12_400, 'en')).toBe('12 km');
  });
});

describe('pickup windows', () => {
  const now = new Date('2026-10-02T10:00:00Z');

  it('detects today and tomorrow in the store timezone', () => {
    expect(relativeDay(new Date('2026-10-02T17:00:00Z'), now, TZ)).toBe('today');
    expect(relativeDay(new Date('2026-10-03T09:00:00Z'), now, TZ)).toBe('tomorrow');
    expect(relativeDay(new Date('2026-10-06T09:00:00Z'), now, TZ)).toBe('other');
  });

  it('formats 24h times in the store timezone', () => {
    // UTC keeps the assertion independent of local DST rules.
    const formatted = formatTime(new Date('2026-10-02T17:00:00Z'), 'UTC', 'en');
    expect(formatted).toBe('17:00');
  });

  it('returns window parts', () => {
    const parts = pickupWindowParts(
      { start: '2026-10-02T17:00:00Z', end: '2026-10-02T18:00:00Z', timezone: 'UTC' },
      now,
      'en',
    );
    expect(parts).toMatchObject({ day: 'today', start: '17:00', end: '18:00' });
  });

  it('computes the pickup phase', () => {
    const w = { start: '2026-10-02T17:00:00Z', end: '2026-10-02T18:00:00Z' };
    expect(pickupPhase(w, new Date('2026-10-02T16:59:00Z'))).toBe('upcoming');
    expect(pickupPhase(w, new Date('2026-10-02T17:30:00Z'))).toBe('open');
    expect(pickupPhase(w, new Date('2026-10-02T18:01:00Z'))).toBe('ended');
  });
});
