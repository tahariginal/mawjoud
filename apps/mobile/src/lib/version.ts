/** Compares `major.minor.patch` versions. Returns true when `current` is older than `minimum`. */
export function isVersionOlder(current: string, minimum: string): boolean {
  const parse = (v: string) => v.split('.').map((part) => Number.parseInt(part, 10) || 0);
  const a = parse(current);
  const b = parse(minimum);
  for (let i = 0; i < 3; i += 1) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    if (x !== y) return x < y;
  }
  return false;
}
