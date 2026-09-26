import { describe, expect, it } from 'vitest';
import { downmixToMono, resampleLinear, truncateToSeconds } from './pcm';

describe('downmixToMono', () => {
  it('averages the channels', () => {
    const mono = downmixToMono([new Float32Array([1, 0, -1]), new Float32Array([0, 1, -1])]);
    expect(Array.from(mono)).toEqual([0.5, 0.5, -1]);
  });

  it('copies a single channel', () => {
    const channel = new Float32Array([0.25, 0.5]);
    const mono = downmixToMono([channel]);
    expect(Array.from(mono)).toEqual([0.25, 0.5]);
    expect(mono).not.toBe(channel);
  });

  it('returns an empty clip when there are no channels', () => {
    expect(downmixToMono([])).toHaveLength(0);
  });
});

describe('resampleLinear', () => {
  it('copies when the rates match', () => {
    const input = new Float32Array([1, 2, 3]);
    const output = resampleLinear(input, 48000, 48000);
    expect(Array.from(output)).toEqual([1, 2, 3]);
    expect(output).not.toBe(input);
  });

  it('upsamples by interpolating', () => {
    const output = resampleLinear(new Float32Array([0, 1, 2, 3]), 1, 2);
    expect(Array.from(output)).toEqual([0, 0.5, 1, 1.5, 2, 2.5, 3, 3]);
  });

  it('downsamples by picking interpolated points', () => {
    const output = resampleLinear(new Float32Array([0, 1, 2, 3, 4, 5]), 2, 1);
    expect(Array.from(output)).toEqual([0, 2, 4]);
  });

  it('handles empty input', () => {
    expect(resampleLinear(new Float32Array(0), 44100, 48000)).toHaveLength(0);
  });
});

describe('truncateToSeconds', () => {
  it('cuts a clip that is too long', () => {
    expect(truncateToSeconds(new Float32Array(48000 * 11), 48000, 10)).toHaveLength(480000);
  });

  it('keeps a clip that fits', () => {
    const samples = new Float32Array(1000);
    expect(truncateToSeconds(samples, 48000, 10)).toHaveLength(1000);
  });
});
