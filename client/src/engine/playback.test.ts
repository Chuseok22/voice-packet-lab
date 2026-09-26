import { describe, expect, it } from 'vitest';
import { SAMPLES_PER_FRAME } from './constants';
import { renderOriginal, renderPlayback, waveformBars } from './playback';
import type { SimulatedPacket } from './types';

function frameOf(value: number): Float32Array {
  return new Float32Array(SAMPLES_PER_FRAME).fill(value);
}

function packetAt(index: number, playoutAtMs: number | null): SimulatedPacket {
  return {
    sequenceNumber: 101 + index,
    timestamp: index * SAMPLES_PER_FRAME,
    ssrc: 3192048,
    sentAtMs: index * 20,
    status: playoutAtMs === null ? 'lost' : 'on-time',
    arrivalAtMs: playoutAtMs,
    playoutAtMs,
    reordered: false,
  };
}

describe('renderPlayback', () => {
  it('places frames at their playout time after leading silence', () => {
    const output = renderPlayback([frameOf(0.1), frameOf(0.2)], [packetAt(0, 100), packetAt(1, 120)]);
    expect(output).toHaveLength(6720);
    expect(output[0]).toBe(0);
    expect(output[4799]).toBe(0);
    expect(output[4800]).toBeCloseTo(0.1);
    expect(output[4800 + SAMPLES_PER_FRAME]).toBeCloseTo(0.2);
  });

  it('leaves silence where a packet was lost or dropped', () => {
    const output = renderPlayback(
      [frameOf(0.3), frameOf(0.3), frameOf(0.3)],
      [packetAt(0, 0), packetAt(1, null), packetAt(2, 40)],
    );
    const gap = output.subarray(SAMPLES_PER_FRAME, 2 * SAMPLES_PER_FRAME);
    expect(Array.from(gap).every((sample) => sample === 0)).toBe(true);
    expect(output[2 * SAMPLES_PER_FRAME]).toBeCloseTo(0.3);
  });

  it('plays reordered frames in arrival order', () => {
    const output = renderPlayback([frameOf(0.1), frameOf(0.2)], [packetAt(0, 60), packetAt(1, 20)]);
    expect(output[20 * 48]).toBeCloseTo(0.2);
    expect(output[60 * 48]).toBeCloseTo(0.1);
  });

  it('sums overlapping frames and clamps to [-1, 1]', () => {
    const output = renderPlayback([frameOf(0.8), frameOf(0.8)], [packetAt(0, 0), packetAt(1, 0)]);
    expect(output[0]).toBe(1);
  });

  it('returns one frame of silence when nothing is played', () => {
    const output = renderPlayback([frameOf(0.5)], [packetAt(0, null)]);
    expect(output).toHaveLength(SAMPLES_PER_FRAME);
    expect(Array.from(output).every((sample) => sample === 0)).toBe(true);
  });

  it('returns one frame of silence for a clip with no frames', () => {
    expect(renderPlayback([], [])).toHaveLength(SAMPLES_PER_FRAME);
  });

  it('does not mutate the input frames', () => {
    const frame = frameOf(0.8);
    renderPlayback([frame, frame], [packetAt(0, 0), packetAt(1, 0)]);
    expect(frame[0]).toBeCloseTo(0.8);
  });
});

describe('renderOriginal', () => {
  it('concatenates frames', () => {
    const output = renderOriginal([frameOf(0.1), frameOf(0.2)]);
    expect(output).toHaveLength(2 * SAMPLES_PER_FRAME);
    expect(output[0]).toBeCloseTo(0.1);
    expect(output[SAMPLES_PER_FRAME]).toBeCloseTo(0.2);
  });

  it('returns one frame of silence for no frames', () => {
    expect(renderOriginal([])).toHaveLength(SAMPLES_PER_FRAME);
  });
});

describe('waveformBars', () => {
  it('returns the absolute peak of each bin', () => {
    const samples = new Float32Array(1920);
    samples.fill(0.5, 0, 960);
    samples.fill(-1, 960, 1920);
    expect(waveformBars(samples, 2, 1920)).toEqual([0.5, 1]);
  });

  it('keeps bins beyond the samples empty when the total is longer', () => {
    const samples = new Float32Array(960).fill(0.5);
    expect(waveformBars(samples, 4, 3840)).toEqual([0.5, 0, 0, 0]);
  });
});
