import { MAX_CLIP_SECONDS, SAMPLE_RATE } from '../engine/constants';
import { downmixToMono, resampleLinear, truncateToSeconds } from './pcm';

export interface DecodedClip {
  samples: Float32Array;
  truncated: boolean;
}

export async function decodeAudioFile(data: ArrayBuffer): Promise<DecodedClip> {
  const context = new OfflineAudioContext(1, 1, SAMPLE_RATE);
  const decoded = await context.decodeAudioData(data);
  const channels = Array.from({ length: decoded.numberOfChannels }, (_, channel) =>
    decoded.getChannelData(channel),
  );
  const mono = downmixToMono(channels);
  // OfflineAudioContext가 이미 48kHz로 리샘플하므로 보통 그대로 쓰지만, 구현이 다른 브라우저를 위한 방어 코드다.
  const atEngineRate =
    decoded.sampleRate === SAMPLE_RATE ? mono : resampleLinear(mono, decoded.sampleRate, SAMPLE_RATE);
  const samples = truncateToSeconds(atEngineRate, SAMPLE_RATE, MAX_CLIP_SECONDS);
  return { samples, truncated: samples.length < atEngineRate.length };
}

export async function loadBundledSample(): Promise<Float32Array> {
  const response = await fetch('/audio/sample.wav');
  if (!response.ok) {
    throw new Error(`샘플 음원을 불러오지 못했습니다 (${response.status})`);
  }
  const { samples } = await decodeAudioFile(await response.arrayBuffer());
  return samples;
}
