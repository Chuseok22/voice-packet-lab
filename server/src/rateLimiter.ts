const WINDOW_MS = 1000;

export interface RateLimiter {
  allow(nowMs: number): boolean;
}

export function createRateLimiter(limitPerSecond: number): RateLimiter {
  const accepted: number[] = [];
  return {
    allow(nowMs: number): boolean {
      while (accepted.length > 0 && nowMs - accepted[0] >= WINDOW_MS) {
        accepted.shift();
      }
      if (accepted.length >= limitPerSecond) {
        return false;
      }
      accepted.push(nowMs);
      return true;
    },
  };
}
