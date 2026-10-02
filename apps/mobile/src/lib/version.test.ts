import { isVersionOlder } from './version';

describe('isVersionOlder', () => {
  it('compares numerically, not lexically', () => {
    expect(isVersionOlder('0.9.0', '0.10.0')).toBe(true);
    expect(isVersionOlder('1.10.0', '1.9.9')).toBe(false);
  });
  it('treats equal versions as not older', () => {
    expect(isVersionOlder('1.2.3', '1.2.3')).toBe(false);
  });
  it('handles missing parts', () => {
    expect(isVersionOlder('1.2', '1.2.1')).toBe(true);
  });
});
