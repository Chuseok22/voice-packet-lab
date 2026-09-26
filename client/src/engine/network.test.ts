import { describe, expect, it } from 'vitest';
import { simulate } from './network';
import type { NetworkSettings } from './types';

const FRAME_COUNT = 150;
const perfect: NetworkSettings = { lossPercent: 0, delayMs: 100, jitterMs: 0, bufferMs: 0, seed: 1 };

function lostSequences(settings: NetworkSettings): Set<number> {
  const { packets } = simulate(FRAME_COUNT, settings);
  return new Set(packets.filter((packet) => packet.status === 'lost').map((packet) => packet.sequenceNumber));
}

describe('simulate', () => {
  it('is deterministic for the same seed and settings', () => {
    const settings = { ...perfect, lossPercent: 15, jitterMs: 80 };
    expect(simulate(FRAME_COUNT, settings)).toEqual(simulate(FRAME_COUNT, settings));
  });

  it('delivers every packet delayMs after sending on a perfect network', () => {
    const { packets, metrics } = simulate(FRAME_COUNT, perfect);
    expect(packets.every((packet) => packet.status === 'on-time')).toBe(true);
    packets.forEach((packet) => expect(packet.playoutAtMs).toBe(packet.sentAtMs + 100));
    expect(metrics).toEqual({ lossRatio: 0, averageLatencyMs: 100, lateDropped: null, reordered: 0 });
  });

  it('keeps packets lost at 15% lost at 20% (monotonic loss)', () => {
    const atFifteen = lostSequences({ ...perfect, lossPercent: 15 });
    const atTwenty = lostSequences({ ...perfect, lossPercent: 20 });
    expect(atFifteen.size).toBeGreaterThan(0);
    atFifteen.forEach((sequence) => expect(atTwenty.has(sequence)).toBe(true));
    expect(atTwenty.size).toBeGreaterThan(atFifteen.size);
  });

  it('loses roughly the configured share of packets', () => {
    const { metrics } = simulate(FRAME_COUNT, { ...perfect, lossPercent: 15 });
    expect(metrics.lossRatio).toBeGreaterThan(0.08);
    expect(metrics.lossRatio).toBeLessThan(0.22);
  });

  it('loses every packet at 100% and reports no latency', () => {
    const { packets, metrics } = simulate(FRAME_COUNT, { ...perfect, lossPercent: 100 });
    expect(packets.every((packet) => packet.status === 'lost')).toBe(true);
    expect(metrics.lossRatio).toBe(1);
    expect(metrics.averageLatencyMs).toBeNull();
  });

  it('plays packets on arrival when the buffer is off', () => {
    const { packets } = simulate(FRAME_COUNT, { ...perfect, jitterMs: 150 });
    packets.forEach((packet) => {
      expect(packet.playoutAtMs).toBe(packet.arrivalAtMs);
      expect(packet.arrivalAtMs).toBeGreaterThanOrEqual(packet.sentAtMs + 100);
      expect(packet.arrivalAtMs).toBeLessThan(packet.sentAtMs + 250);
    });
  });

  it('never drops packets as late when buffer >= jitter', () => {
    const { packets, metrics } = simulate(FRAME_COUNT, { ...perfect, jitterMs: 150, bufferMs: 160 });
    expect(metrics.lateDropped).toBe(0);
    expect(packets.every((packet) => packet.status === 'on-time')).toBe(true);
  });

  it('reports average latency of delay + buffer when the buffer is on', () => {
    const { metrics } = simulate(FRAME_COUNT, { ...perfect, jitterMs: 150, bufferMs: 160 });
    expect(metrics.averageLatencyMs).toBe(260);
  });

  it('drops packets that miss the fixed playout deadline', () => {
    const { packets, metrics } = simulate(FRAME_COUNT, { ...perfect, jitterMs: 300, bufferMs: 20 });
    const late = packets.filter((packet) => packet.status === 'late');
    expect(late.length).toBeGreaterThan(0);
    expect(metrics.lateDropped).toBe(late.length);
    late.forEach((packet) => expect(packet.playoutAtMs).toBeNull());
  });

  it('produces no reordering when jitter is at most one frame', () => {
    const { metrics } = simulate(FRAME_COUNT, { ...perfect, jitterMs: 20, lossPercent: 20 });
    expect(metrics.reordered).toBe(0);
  });

  it('produces reordering under heavy jitter', () => {
    const { metrics, packets } = simulate(FRAME_COUNT, { ...perfect, jitterMs: 300 });
    expect(metrics.reordered).toBeGreaterThan(0);
    expect(packets.filter((packet) => packet.reordered)).toHaveLength(metrics.reordered);
  });

  it('handles a clip with zero frames', () => {
    const { packets, metrics } = simulate(0, perfect);
    expect(packets).toEqual([]);
    expect(metrics).toEqual({ lossRatio: 0, averageLatencyMs: null, lateDropped: null, reordered: 0 });
  });
});
