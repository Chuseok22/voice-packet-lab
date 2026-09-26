import { FIRST_SEQUENCE, FRAME_MS, SAMPLES_PER_FRAME, SSRC } from './constants';
import type { RtpPacket } from './types';

export function createPackets(frameCount: number): RtpPacket[] {
  return Array.from({ length: frameCount }, (_, index) => ({
    sequenceNumber: FIRST_SEQUENCE + index,
    timestamp: index * SAMPLES_PER_FRAME,
    ssrc: SSRC,
    sentAtMs: index * FRAME_MS,
  }));
}

export function splitIntoFrames(samples: Float32Array): Float32Array[] {
  const frameCount = Math.ceil(samples.length / SAMPLES_PER_FRAME);
  return Array.from({ length: frameCount }, (_, index) => {
    const frame = new Float32Array(SAMPLES_PER_FRAME);
    frame.set(samples.subarray(index * SAMPLES_PER_FRAME, (index + 1) * SAMPLES_PER_FRAME));
    return frame;
  });
}
