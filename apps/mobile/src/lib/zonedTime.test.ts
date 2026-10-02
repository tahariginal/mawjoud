import { parseTimeOfDay, zonedDate, zonedTimeToUtc } from './zonedTime';

describe('zonedTimeToUtc', () => {
  it('is identity for UTC', () => {
    expect(
      zonedTimeToUtc(
        { year: 2026, month: 10, day: 2 },
        { hour: 18, minute: 30 },
        'UTC',
      ).toISOString(),
    ).toBe('2026-10-02T18:30:00.000Z');
  });

  it('round-trips through the zone for a fixed-offset zone', () => {
    // Asia/Tokyo has no DST and is UTC+9.
    expect(
      zonedTimeToUtc(
        { year: 2026, month: 1, day: 15 },
        { hour: 9, minute: 0 },
        'Asia/Tokyo',
      ).toISOString(),
    ).toBe('2026-01-15T00:00:00.000Z');
  });

  it('handles a DST zone in summer and winter', () => {
    // Europe/Paris: UTC+2 in July, UTC+1 in January.
    expect(
      zonedTimeToUtc(
        { year: 2026, month: 7, day: 1 },
        { hour: 12, minute: 0 },
        'Europe/Paris',
      ).toISOString(),
    ).toBe('2026-07-01T10:00:00.000Z');
    expect(
      zonedTimeToUtc(
        { year: 2026, month: 1, day: 1 },
        { hour: 12, minute: 0 },
        'Europe/Paris',
      ).toISOString(),
    ).toBe('2026-01-01T11:00:00.000Z');
  });
});

describe('zonedDate', () => {
  it('uses the calendar date in the zone, not UTC', () => {
    // 23:30 UTC on Oct 2 is already Oct 3 in Tokyo.
    expect(zonedDate(new Date('2026-10-02T23:30:00Z'), 'Asia/Tokyo')).toEqual({
      year: 2026,
      month: 10,
      day: 3,
    });
  });
  it('adds days across month ends', () => {
    expect(zonedDate(new Date('2026-10-31T12:00:00Z'), 'UTC', 1)).toEqual({
      year: 2026,
      month: 11,
      day: 1,
    });
  });
});

describe('parseTimeOfDay', () => {
  it('accepts HH:MM and rejects anything else', () => {
    expect(parseTimeOfDay('18:30')).toEqual({ hour: 18, minute: 30 });
    expect(parseTimeOfDay('24:00')).toBeNull();
    expect(parseTimeOfDay('7:30')).toBeNull();
    expect(parseTimeOfDay('abc')).toBeNull();
  });
});
