import { SAMPLES_PER_FRAME, SAMPLES_PER_MS } from './constants';
import type { SimulatedPacket } from './types';

interface Placement {
  frame: Float32Array;
  startSample: number;
}

function placementsOf(frames: Float32Array[], packets: SimulatedPacket[]): Placement[] {
  return packets.flatMap((packet, index) =>
    packet.playoutAtMs === null
      ? []
      : [{ frame: frames[index], startSample: Math.round(packet.playoutAtMs * SAMPLES_PER_MS) }],
  );
}

export function renderPlayback(frames: Float32Array[], packets: SimulatedPacket[]): Float32Array {
  const placements = placementsOf(frames, packets);
  if (placements.length === 0) {
    return new Float32Array(SAMPLES_PER_FRAME);
  }

  const lastStart = placements.reduce((latest, { startSample }) => Math.max(latest, startSample), 0);
  const output = new Float32Array(lastStart + SAMPLES_PER_FRAME);
  for (const { frame, startSample } of placements) {
    for (let offset = 0; offset < frame.length; offset += 1) {
      output[startSample + offset] += frame[offset];
    }
  }
  for (let index = 0; index < output.length; index += 1) {
    output[index] = Math.max(-1, Math.min(1, output[index]));
  }
  return output;
}

export function renderOriginal(frames: Float32Array[]): Float32Array {
  if (frames.length === 0) {
    return new Float32Array(SAMPLES_PER_FRAME);
  }
  const output = new Float32Array(frames.length * SAMPLES_PER_FRAME);
  frames.forEach((frame, index) => output.set(frame, index * SAMPLES_PER_FRAME));
  return output;
}

export function waveformBars(samples: Float32Array, barCount: number, totalSamples: number): number[] {
  const bars = new Array<number>(barCount).fill(0);
  const binSize = Math.max(1, Math.ceil(totalSamples / barCount));
  for (let index = 0; index < samples.length; index += 1) {
    const bin = Math.min(barCount - 1, Math.floor(index / binSize));
    bars[bin] = Math.max(bars[bin], Math.abs(samples[index]));
  }
  return bars;
}
