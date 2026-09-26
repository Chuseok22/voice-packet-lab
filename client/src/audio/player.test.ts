import { afterEach, describe, expect, it, vi } from 'vitest';
import { SamplePlayer } from './player';

class FakeAudioContext {
  static instances: FakeAudioContext[] = [];
  state = 'suspended';
  currentTime = 0;
  destination = {};
  resumed = 0;
  closed = 0;

  constructor() {
    FakeAudioContext.instances.push(this);
  }

  async resume(): Promise<void> {
    this.resumed += 1;
    this.state = 'running';
  }

  async close(): Promise<void> {
    this.closed += 1;
  }

  createBuffer() {
    return { getChannelData: () => new Float32Array(4) };
  }

  createBufferSource() {
    return { buffer: null, onended: null, connect: vi.fn(), disconnect: vi.fn(), start: vi.fn(), stop: vi.fn() };
  }
}

describe('SamplePlayer', () => {
  afterEach(() => {
    FakeAudioContext.instances = [];
    vi.unstubAllGlobals();
  });

  it('closes its context on dispose and creates a fresh one for a later play', async () => {
    vi.stubGlobal('AudioContext', FakeAudioContext);
    const player = new SamplePlayer();
    await player.play(new Float32Array(4), () => undefined);
    expect(FakeAudioContext.instances).toHaveLength(1);

    player.dispose();
    expect(FakeAudioContext.instances[0]?.closed).toBe(1);

    await player.play(new Float32Array(4), () => undefined);
    expect(FakeAudioContext.instances).toHaveLength(2);
  });

  it('resumes a context that is not running (e.g. iOS interrupted)', async () => {
    vi.stubGlobal('AudioContext', FakeAudioContext);
    const player = new SamplePlayer();
    await player.play(new Float32Array(4), () => undefined);
    const context = FakeAudioContext.instances[0];
    if (!context) throw new Error('context was not created');
    context.state = 'interrupted';
    await player.play(new Float32Array(4), () => undefined);
    expect(context.resumed).toBe(2);
  });
});
