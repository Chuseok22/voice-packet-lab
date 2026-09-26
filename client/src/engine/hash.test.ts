import { describe, expect, it } from 'vitest';
import { unitHash } from './hash';

describe('unitHash', () => {
  it('always returns a value in [0, 1)', () => {
    for (let sequence = 101; sequence < 1101; sequence += 1) {
      const value = unitHash(1, sequence, 0);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('is deterministic for the same inputs', () => {
    expect(unitHash(7, 150, 1)).toBe(unitHash(7, 150, 1));
  });

  it('differs between channels and between seeds', () => {
    expect(unitHash(7, 150, 0)).not.toBe(unitHash(7, 150, 1));
    expect(unitHash(7, 150, 0)).not.toBe(unitHash(8, 150, 0));
  });

  it('is roughly uniform', () => {
    const count = 5000;
    let sum = 0;
    let belowFifteenPercent = 0;
    for (let index = 0; index < count; index += 1) {
      const value = unitHash(1, 101 + index, 0);
      sum += value;
      if (value < 0.15) belowFifteenPercent += 1;
    }
    expect(sum / count).toBeGreaterThan(0.45);
    expect(sum / count).toBeLessThan(0.55);
    expect(belowFifteenPercent / count).toBeGreaterThan(0.12);
    expect(belowFifteenPercent / count).toBeLessThan(0.18);
  });
});
