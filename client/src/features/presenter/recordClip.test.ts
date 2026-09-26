import { afterEach, describe, expect, it, vi } from 'vitest';
import { RecordingError, startRecording } from './recordClip';

const stopTrack = vi.fn();

function stubMicrophone(): void {
  const stream = { getTracks: () => [{ stop: stopTrack }] };
  Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true });
  Object.defineProperty(navigator, 'mediaDevices', {
    value: { getUserMedia: () => Promise.resolve(stream) },
    configurable: true,
  });
}

class ThrowingOnStartRecorder {
  state = 'inactive';
  mimeType = 'audio/webm';
  addEventListener(): void {}
  start(): void {
    throw new Error('start failed');
  }
}

class FailingRecorder {
  static instance: FailingRecorder | null = null;
  state = 'recording';
  mimeType = 'audio/webm';
  listeners = new Map<string, () => void>();

  constructor() {
    FailingRecorder.instance = this;
  }

  addEventListener(type: string, listener: () => void): void {
    this.listeners.set(type, listener);
  }

  start(): void {}
  stop(): void {}
}

describe('startRecording', () => {
  afterEach(() => {
    stopTrack.mockReset();
    vi.unstubAllGlobals();
  });

  it('releases the microphone when the recorder cannot start', async () => {
    stubMicrophone();
    vi.stubGlobal('MediaRecorder', ThrowingOnStartRecorder);
    await expect(startRecording(5, () => undefined)).rejects.toBeInstanceOf(RecordingError);
    expect(stopTrack).toHaveBeenCalledTimes(1);
  });

  it('releases the microphone and rejects when the recorder reports an error', async () => {
    stubMicrophone();
    vi.stubGlobal('MediaRecorder', FailingRecorder);
    const session = await startRecording(5, () => undefined);
    FailingRecorder.instance?.listeners.get('error')?.();
    await expect(session.stop()).rejects.toBeInstanceOf(RecordingError);
    expect(stopTrack).toHaveBeenCalledTimes(1);
  });
});
