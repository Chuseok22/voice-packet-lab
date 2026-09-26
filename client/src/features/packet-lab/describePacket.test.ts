import { describe, expect, it } from 'vitest';
import type { NetworkSettings, SimulatedPacket } from '../../engine/types';
import { describePacket } from './describePacket';

const settings: NetworkSettings = { lossPercent: 0, delayMs: 100, jitterMs: 150, bufferMs: 0, seed: 1 };

function packet(overrides: Partial<SimulatedPacket>): SimulatedPacket {
  return {
    sequenceNumber: 104,
    timestamp: 2880,
    ssrc: 3192048,
    sentAtMs: 60,
    status: 'on-time',
    arrivalAtMs: 240,
    playoutAtMs: 240,
    reordered: false,
    ...overrides,
  };
}

describe('describePacket', () => {
  it('explains a lost packet', () => {
    expect(describePacket(packet({ status: 'lost', arrivalAtMs: null, playoutAtMs: null }), settings)).toContain('사라져');
  });

  it('explains a late packet with the deadline and the overshoot', () => {
    const text = describePacket(
      packet({ status: 'late', playoutAtMs: null, arrivalAtMs: 60 + 180 }),
      { ...settings, bufferMs: 60 },
    );
    expect(text).toContain('160ms');
    expect(text).toContain('20ms');
    expect(text).toContain('폐기');
  });

  it('explains reordering with and without a buffer', () => {
    expect(describePacket(packet({ reordered: true }), settings)).toContain('뒤섞입니다');
    expect(describePacket(packet({ reordered: true }), { ...settings, bufferMs: 160 })).toContain('바로잡아');
  });

  it('explains an on-time packet with and without a buffer', () => {
    expect(describePacket(packet({}), settings)).toContain('180ms');
    const buffered = describePacket(packet({ playoutAtMs: 320 }), { ...settings, bufferMs: 160 });
    expect(buffered).toContain('260ms');
  });
});
