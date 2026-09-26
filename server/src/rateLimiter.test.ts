import { describe, expect, it } from 'vitest';
import { createRateLimiter } from './rateLimiter';

describe('createRateLimiter', () => {
  it('allows up to the limit within one second and rejects the rest', () => {
    const limiter = createRateLimiter(3);
    expect([0, 1, 2, 3, 4].map((offset) => limiter.allow(1000 + offset))).toEqual([true, true, true, false, false]);
  });

  it('allows traffic again after the window slides', () => {
    const limiter = createRateLimiter(2);
    limiter.allow(0);
    limiter.allow(10);
    expect(limiter.allow(20)).toBe(false);
    expect(limiter.allow(1000)).toBe(true);
  });

  it('does not count rejected messages against the window', () => {
    const limiter = createRateLimiter(1);
    expect(limiter.allow(0)).toBe(true);
    for (let offset = 1; offset < 100; offset += 1) limiter.allow(offset);
    expect(limiter.allow(1000)).toBe(true);
  });

  it('accepts a steady rate below the limit', () => {
    const limiter = createRateLimiter(20);
    for (let index = 0; index < 100; index += 1) {
      expect(limiter.allow(index * 100)).toBe(true);
    }
  });
});
