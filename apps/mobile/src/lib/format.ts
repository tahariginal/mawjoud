import type { Money } from '@mawjood/contracts';

/** Minor units per major unit. MAD and the other currencies we expect use 2 decimals. */
const MINOR_UNITS = 100;

export function formatMoney(money: Money, locale: string): string {
  const amount = money.amountMinor / MINOR_UNITS;
  const hasCents = money.amountMinor % MINOR_UNITS !== 0;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: money.currency,
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Savings between a legitimate reference value and the price; null when not applicable. */
export function savingsOf(price: Money, reference: Money | null): Money | null {
  if (!reference || reference.currency !== price.currency) return null;
  const diff = reference.amountMinor - price.amountMinor;
  return diff > 0 ? { amountMinor: diff, currency: price.currency } : null;
}

export function formatDistance(meters: number, locale: string): string {
  if (meters < 1000) {
    const rounded = Math.max(10, Math.round(meters / 10) * 10);
    return `${new Intl.NumberFormat(locale).format(rounded)} m`;
  }
  const km = meters / 1000;
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: km < 10 ? 1 : 0 }).format(km)} km`;
}

/** `YYYY-MM-DD` of an instant in a given IANA timezone. */
function dayKey(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function dayKeyToUtcMs(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

export type RelativeDay = 'today' | 'tomorrow' | 'yesterday' | 'other';

export function relativeDay(instant: Date, now: Date, timeZone: string): RelativeDay {
  const diffDays = Math.round(
    (dayKeyToUtcMs(dayKey(instant, timeZone)) - dayKeyToUtcMs(dayKey(now, timeZone))) / 86_400_000,
  );
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'tomorrow';
  if (diffDays === -1) return 'yesterday';
  return 'other';
}

export function formatTime(instant: Date, timeZone: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(instant);
}

export function formatShortDate(instant: Date, timeZone: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(instant);
}

export type PickupWindowParts = {
  day: RelativeDay;
  /** Localized date for `other` days, e.g. "Mon, 5 Oct". */
  dateLabel: string;
  start: string;
  end: string;
};

export function pickupWindowParts(
  window: { start: string; end: string; timezone: string },
  now: Date,
  locale: string,
): PickupWindowParts {
  const start = new Date(window.start);
  const end = new Date(window.end);
  return {
    day: relativeDay(start, now, window.timezone),
    dateLabel: formatShortDate(start, window.timezone, locale),
    start: formatTime(start, window.timezone, locale),
    end: formatTime(end, window.timezone, locale),
  };
}

export type PickupPhase = 'upcoming' | 'open' | 'ended';

export function pickupPhase(window: { start: string; end: string }, now: Date): PickupPhase {
  const t = now.getTime();
  if (t < Date.parse(window.start)) return 'upcoming';
  if (t <= Date.parse(window.end)) return 'open';
  return 'ended';
}
