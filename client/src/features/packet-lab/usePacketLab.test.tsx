import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import type { AudioPlayer } from '../../audio/player';
import { usePacketLab } from './usePacketLab';

class FakePlayer implements AudioPlayer {
  plays: Float32Array[] = [];
  stops = 0;
  disposes = 0;
  onEnded: (() => void) | null = null;
  failWith: Error | null = null;
  gate: Promise<void> | null = null;

  async play(samples: Float32Array, onEnded: () => void): Promise<void> {
    if (this.gate) await this.gate;
    if (this.failWith) throw this.failWith;
    this.plays.push(samples);
    this.onEnded = onEnded;
  }

  stop(): void {
    this.stops += 1;
  }

  dispose(): void {
    this.disposes += 1;
  }

  positionMs(): number {
    return 0;
  }
}

const FRAMES = Array.from({ length: 10 }, () => new Float32Array(960).fill(0.1));

function setup(frames = FRAMES) {
  const player = new FakePlayer();
  const hook = renderHook(() => usePacketLab(frames, () => player));
  return { player, ...hook };
}

describe('usePacketLab', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/');
  });

  it('reads the initial settings from the URL', () => {
    window.history.replaceState(null, '', '/?loss=10&delay=50&jitter=0&buffer=0&seed=3');
    const { result } = setup();
    expect(result.current.settings).toEqual({ lossPercent: 10, delayMs: 50, jitterMs: 0, bufferMs: 0, seed: 3 });
  });

  it('applies a scenario, keeps the seed and mirrors settings into the URL', () => {
    window.history.replaceState(null, '', '/?seed=7');
    const { result } = setup();
    act(() => result.current.chooseScenario('jitter-buffer'));
    expect(result.current.settings).toMatchObject({ jitterMs: 150, bufferMs: 160, seed: 7 });
    expect(result.current.scenarioId).toBe('jitter-buffer');
    expect(window.location.search).toBe('?loss=0&delay=100&jitter=150&buffer=160&seed=7');
  });

  it('selects a packet by sequence number and ignores unknown ones', () => {
    const { result } = setup();
    act(() => result.current.selectPacket(105));
    expect(result.current.selectedPacket?.sequenceNumber).toBe(105);
    act(() => result.current.selectPacket(999));
    expect(result.current.selectedPacket).toBeNull();
  });

  it('starts, switches and stops playback', async () => {
    const { result, player } = setup();
    await act(() => result.current.togglePlayback('degraded'));
    expect(result.current.playing).toBe('degraded');

    await act(() => result.current.togglePlayback('original'));
    expect(result.current.playing).toBe('original');
    expect(player.plays).toHaveLength(2);

    await act(() => result.current.togglePlayback('original'));
    expect(result.current.playing).toBeNull();
  });

  it('keeps only the latest request when the same button is clicked twice quickly', async () => {
    const { result, player } = setup();
    await act(async () => {
      const first = result.current.togglePlayback('degraded');
      const second = result.current.togglePlayback('degraded');
      await Promise.all([first, second]);
    });
    expect(player.plays).toHaveLength(2);
    expect(result.current.playing).toBe('degraded');
  });

  it('clears the playing state when playback ends naturally', async () => {
    const { result, player } = setup();
    await act(() => result.current.togglePlayback('degraded'));
    act(() => player.onEnded?.());
    expect(result.current.playing).toBeNull();
  });

  it('stops playback when a setting changes', async () => {
    const { result, player } = setup();
    await act(() => result.current.togglePlayback('degraded'));
    const stopsBefore = player.stops;
    act(() => result.current.updateSettings({ lossPercent: 5 }));
    expect(result.current.playing).toBeNull();
    expect(player.stops).toBeGreaterThan(stopsBefore);
  });

  it('does not show "playing" when a setting changes while playback is still starting', async () => {
    const { result, player } = setup();
    let release: () => void = () => undefined;
    player.gate = new Promise<void>((resolve) => {
      release = resolve;
    });

    let pending: Promise<void> = Promise.resolve();
    act(() => {
      pending = result.current.togglePlayback('degraded');
    });
    act(() => result.current.updateSettings({ lossPercent: 5 }));
    await act(async () => {
      release();
      await pending;
    });
    expect(result.current.playing).toBeNull();
  });

  it('reports a playback failure in Korean', async () => {
    const { result, player } = setup();
    player.failWith = new Error('blocked');
    await act(() => result.current.togglePlayback('degraded'));
    expect(result.current.playing).toBeNull();
    expect(result.current.playbackError).toContain('소리를 재생할 수 없습니다');
  });

  it('disposes the player on unmount', () => {
    const { player, unmount } = setup();
    expect(player.disposes).toBe(0);
    unmount();
    expect(player.disposes).toBe(1);
  });

  it('survives a clip with no frames', async () => {
    const { result } = setup([]);
    expect(result.current.result.packets).toEqual([]);
    expect(result.current.result.metrics.averageLatencyMs).toBeNull();
    await act(() => result.current.togglePlayback('degraded'));
    expect(result.current.playing).toBe('degraded');
  });

  it('builds normalized waveforms of the same length', () => {
    const { result } = setup();
    expect(result.current.waveforms.original).toHaveLength(60);
    expect(result.current.waveforms.degraded).toHaveLength(60);
    expect(Math.max(...result.current.waveforms.original)).toBeLessThanOrEqual(1);
  });
});
