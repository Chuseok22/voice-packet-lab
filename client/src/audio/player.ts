import { SAMPLE_RATE } from '../engine/constants';

export interface AudioPlayer {
  play(samples: Float32Array, onEnded: () => void): Promise<void>;
  stop(): void;
  dispose(): void;
  positionMs(): number;
}

export class SamplePlayer implements AudioPlayer {
  private context: AudioContext | null = null;
  private source: AudioBufferSourceNode | null = null;
  private startedAtSeconds = 0;
  /** stop()/play()가 호출될 때마다 증가. resume() 대기 중이던 오래된 play 요청을 무효화한다. */
  private playToken = 0;

  async play(samples: Float32Array, onEnded: () => void): Promise<void> {
    this.stop();
    const token = this.playToken;
    const context = this.context ?? new AudioContext();
    this.context = context;
    if (context.state !== 'running') {
      await context.resume();
    }
    if (token !== this.playToken) {
      return;
    }

    const buffer = context.createBuffer(1, samples.length, SAMPLE_RATE);
    buffer.getChannelData(0).set(samples);
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);
    source.onended = () => {
      if (this.source === source) {
        this.source = null;
        onEnded();
      }
    };
    this.source = source;
    this.startedAtSeconds = context.currentTime;
    source.start();
  }

  stop(): void {
    this.playToken += 1;
    const source = this.source;
    if (!source) {
      return;
    }
    this.source = null;
    source.onended = null;
    source.stop();
    source.disconnect();
  }

  dispose(): void {
    this.stop();
    void this.context?.close();
    this.context = null;
  }

  positionMs(): number {
    if (!this.context || !this.source) {
      return 0;
    }
    return (this.context.currentTime - this.startedAtSeconds) * 1000;
  }
}
