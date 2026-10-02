type Parts = { year: number; month: number; day: number; hour: number; minute: number };

function partsInZone(instant: Date, timeZone: string): Parts {
  const formatted = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instant);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(formatted.find((p) => p.type === type)?.value ?? '0');
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
  };
}

const asUtc = (p: Parts) => Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);

/** Calendar date (Y-M-D) of an instant in a timezone, shifted by `addDays`. */
export function zonedDate(
  instant: Date,
  timeZone: string,
  addDays = 0,
): { year: number; month: number; day: number } {
  const p = partsInZone(instant, timeZone);
  const shifted = new Date(Date.UTC(p.year, p.month - 1, p.day + addDays));
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

/**
 * Converts a wall-clock time in `timeZone` to a UTC instant, without a timezone library.
 * Two passes handle offset changes (DST) around the target time.
 */
export function zonedTimeToUtc(
  date: { year: number; month: number; day: number },
  time: { hour: number; minute: number },
  timeZone: string,
): Date {
  const target = Date.UTC(date.year, date.month - 1, date.day, time.hour, time.minute);
  let guess = target;
  for (let i = 0; i < 2; i += 1) {
    const offset = asUtc(partsInZone(new Date(guess), timeZone)) - guess;
    guess = target - offset;
  }
  return new Date(guess);
}

/** Parses `HH:MM`; returns null when invalid. */
export function parseTimeOfDay(value: string): { hour: number; minute: number } | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value.trim());
  if (!match) return null;
  return { hour: Number(match[1]), minute: Number(match[2]) };
}
