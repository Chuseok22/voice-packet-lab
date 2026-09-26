import { describe, expect, it } from 'vitest';
import { createPackets, splitIntoFrames } from './packets';

describe('createPackets', () => {
  it('numbers packets from 101 with 960-sample timestamps and 20ms send times', () => {
    const packets = createPackets(3);
    expect(packets.map((packet) => packet.sequenceNumber)).toEqual([101, 102, 103]);
    expect(packets.map((packet) => packet.timestamp)).toEqual([0, 960, 1920]);
    expect(packets.map((packet) => packet.sentAtMs)).toEqual([0, 20, 40]);
    expect(packets.every((packet) => packet.ssrc === 3192048)).toBe(true);
  });

  it('returns an empty list for zero frames', () => {
    expect(createPackets(0)).toEqual([]);
  });
});

describe('splitIntoFrames', () => {
  it('splits into 960-sample frames and zero-pads the last one', () => {
    const samples = new Float32Array(2000).fill(0.5);
    const frames = splitIntoFrames(samples);
    expect(frames).toHaveLength(3);
    expect(frames.every((frame) => frame.length === 960)).toBe(true);
    expect(frames[2][79]).toBe(0.5);
    expect(frames[2][80]).toBe(0);
  });

  it('returns no frames for an empty clip', () => {
    expect(splitIntoFrames(new Float32Array(0))).toEqual([]);
  });

  it('does not mutate the input', () => {
    const samples = new Float32Array([1, 2, 3]);
    splitIntoFrames(samples);
    expect(Array.from(samples)).toEqual([1, 2, 3]);
  });
});
