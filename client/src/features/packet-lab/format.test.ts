import { describe, expect, it } from 'vitest';
import { describeSettings, formatMs, formatPercent } from './format';

describe('format', () => {
  it('formats ratios as one-decimal percentages', () => {
    expect(formatPercent(0.147)).toBe('14.7%');
    expect(formatPercent(0)).toBe('0.0%');
  });

  it('formats milliseconds as whole numbers', () => {
    expect(formatMs(102.6)).toBe('103 ms');
  });

  it('summarizes settings with the buffer state', () => {
    const base = { lossPercent: 15, delayMs: 100, jitterMs: 80, seed: 1 };
    expect(describeSettings({ ...base, bufferMs: 0 })).toBe('Loss 15% · Delay 100ms · Jitter 80ms · Buffer OFF');
    expect(describeSettings({ ...base, bufferMs: 160 })).toBe('Loss 15% · Delay 100ms · Jitter 80ms · Buffer 160ms');
  });
});
