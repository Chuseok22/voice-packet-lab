import { describe, expect, it } from 'vitest';
import type { SimulatedPacket } from '../../engine/types';
import { CELL_WIDTH, LEFT_GUTTER, PX_PER_MS, buildLaneLayout, xOf } from './laneLayout';

function packet(index: number, arrivalAtMs: number | null, status: SimulatedPacket['status'] = 'on-time'): SimulatedPacket {
  return {
    sequenceNumber: 101 + index,
    timestamp: index * 960,
    ssrc: 3192048,
    sentAtMs: index * 20,
    status,
    arrivalAtMs,
    playoutAtMs: arrivalAtMs,
    reordered: false,
  };
}

describe('buildLaneLayout', () => {
  it('places sender cells by send time and receiver cells by arrival time', () => {
    const layout = buildLaneLayout([packet(0, 100), packet(1, 130)], 100);
    expect(layout.senders.map((cell) => cell.x)).toEqual([xOf(0), xOf(20)]);
    expect(layout.receivers.map((cell) => cell.x)).toEqual([xOf(100), xOf(130)]);
    expect(xOf(20)).toBe(LEFT_GUTTER + 20 * PX_PER_MS);
  });

  it('places a lost packet at its nominal arrival and draws no line for it', () => {
    const layout = buildLaneLayout([packet(0, 100), packet(1, null, 'lost')], 100);
    const lost = layout.receivers[1];
    expect(lost.status).toBe('lost');
    expect(lost.x).toBe(xOf(20 + 100));
    expect(layout.lines).toHaveLength(1);
  });

  it('flags late lines and carries the reordered flag', () => {
    const late = { ...packet(1, 300, 'late'), reordered: true };
    const layout = buildLaneLayout([packet(0, 100), late], 100);
    expect(layout.lines[1].late).toBe(true);
    expect(layout.receivers[1].reordered).toBe(true);
  });

  it('is wide enough to contain every receiver cell', () => {
    const layout = buildLaneLayout([packet(0, 100), packet(1, 480)], 100);
    const rightmost = Math.max(...layout.receivers.map((cell) => cell.x));
    expect(layout.width).toBeGreaterThanOrEqual(rightmost + CELL_WIDTH);
  });

  it('handles an empty clip', () => {
    const layout = buildLaneLayout([], 100);
    expect(layout.senders).toEqual([]);
    expect(layout.width).toBeGreaterThan(LEFT_GUTTER);
  });
});
