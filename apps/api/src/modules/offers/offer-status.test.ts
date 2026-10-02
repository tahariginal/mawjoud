import { describe, expect, it } from 'vitest';

import { displayOfferStatus } from './offer-status.ts';

const now = new Date('2026-10-02T12:00:00Z');
const later = new Date('2026-10-02T18:00:00Z');
const earlier = new Date('2026-10-02T10:00:00Z');

describe('displayOfferStatus', () => {
  it('is ACTIVE with stock and SOLD_OUT without', () => {
    expect(displayOfferStatus('ACTIVE', 3, later, now)).toBe('ACTIVE');
    expect(displayOfferStatus('ACTIVE', 0, later, now)).toBe('SOLD_OUT');
  });

  it('ends automatically when the pickup window has passed', () => {
    expect(displayOfferStatus('ACTIVE', 3, earlier, now)).toBe('ENDED');
    expect(displayOfferStatus('PAUSED', 3, earlier, now)).toBe('ENDED');
  });

  it('respects merchant lifecycle states', () => {
    expect(displayOfferStatus('PAUSED', 3, later, now)).toBe('PAUSED');
    expect(displayOfferStatus('ENDED', 3, later, now)).toBe('ENDED');
    expect(displayOfferStatus('REMOVED', 3, later, now)).toBe('REMOVED');
    expect(displayOfferStatus('DRAFT', 3, later, now)).toBe('DRAFT');
  });
});
