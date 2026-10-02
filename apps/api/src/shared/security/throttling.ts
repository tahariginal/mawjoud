import { Injectable } from '@nestjs/common';
import { ThrottlerGuard, type ThrottlerStorage } from '@nestjs/throttler';
import type { Redis } from 'ioredis';

import type { AuthedRequest } from './current-user.ts';

/**
 * Atomic fixed-window counter with optional block, mirroring the semantics of the built-in
 * in-memory storage (ttl/blockDuration in ms in, seconds out) but shared across instances.
 */
const INCREMENT_SCRIPT = `
local hits = redis.call('INCR', KEYS[1])
if hits == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
local ttl = redis.call('PTTL', KEYS[1])
local blocked = redis.call('PTTL', KEYS[2])
if blocked < 0 and hits > tonumber(ARGV[2]) then
  redis.call('SET', KEYS[2], '1', 'PX', ARGV[3])
  blocked = tonumber(ARGV[3])
end
return {hits, ttl, blocked}
`;

export class RedisThrottlerStorage implements ThrottlerStorage {
  constructor(private readonly redis: Redis) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ) {
    const hitsKey = `throttle:${throttlerName}:${key}`;
    const blockKey = `${hitsKey}:blocked`;
    const block = blockDuration > 0 ? blockDuration : ttl;
    const [hits, ttlMs, blockedMs] = (await this.redis.eval(
      INCREMENT_SCRIPT,
      2,
      hitsKey,
      blockKey,
      String(ttl),
      String(limit),
      String(block),
    )) as [number, number, number];
    const isBlocked = blockedMs > 0;
    return {
      totalHits: hits,
      timeToExpire: Math.max(0, Math.ceil(ttlMs / 1000)),
      isBlocked,
      timeToBlockExpire: isBlocked ? Math.ceil(blockedMs / 1000) : 0,
    };
  }
}

/** Rate-limit key: the user when authenticated (runs after AuthGuard), else the client IP. */
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected override async getTracker(req: Record<string, unknown>): Promise<string> {
    const r = req as unknown as AuthedRequest;
    return r.user ? `user:${r.user.id}` : `ip:${r.ip ?? 'unknown'}`;
  }
}

/**
 * For credential endpoints: key on IP + email, so one IP cannot hammer one account and the
 * per-email budget is not shared by unrelated users behind the same carrier NAT.
 */
export function ipAndEmailTracker(req: Record<string, unknown>): string {
  const r = req as unknown as AuthedRequest;
  const body = r.body as { email?: unknown } | undefined;
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  return `ip:${r.ip ?? 'unknown'}:email:${email}`;
}
