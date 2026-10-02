import { describe, expect, it } from 'vitest';

import { AppError } from '../errors/app-error.ts';
import { CursorCodec } from './cursor.ts';

const codec = new CursorCodec('test-secret-test-secret-test-secret');

describe('CursorCodec', () => {
  it('round-trips the sort key for the same query', () => {
    const h = codec.queryHash({ sort: 'distance', lat: 33.5 });
    const cursor = codec.encode([0, 812.5, '0192abcd'], h);
    expect(codec.decode(cursor, h)).toEqual([0, 812.5, '0192abcd']);
  });

  it('rejects a cursor used with different filters', () => {
    const cursor = codec.encode([1, 'x'], codec.queryHash({ sort: 'price' }));
    expect(() => codec.decode(cursor, codec.queryHash({ sort: 'distance' }))).toThrow(AppError);
  });

  it('rejects tampered or malformed cursors', () => {
    const h = codec.queryHash({});
    const cursor = codec.encode([1, 'x'], h);
    const [payload, sig] = cursor.split('.');
    const forged = Buffer.from(JSON.stringify({ k: [0, 'y'], h })).toString('base64url');
    expect(() => codec.decode(`${forged}.${sig}`, h)).toThrow(AppError);
    expect(() => codec.decode(`${payload}`, h)).toThrow(AppError);
    expect(() => codec.decode('not-a-cursor', h)).toThrow(AppError);
    expect(() => new CursorCodec('other-secret-other-secret-other').decode(cursor, h)).toThrow(
      AppError,
    );
  });
});
