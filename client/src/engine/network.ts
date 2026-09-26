import { JITTER_CHANNEL, LOSS_CHANNEL } from './constants';
import { unitHash } from './hash';
import { computeMetrics, markReordered } from './metrics';
import { createPackets } from './packets';
import type { NetworkSettings, RtpPacket, SimulatedPacket, SimulationResult } from './types';

function deliver(packet: RtpPacket, settings: NetworkSettings): SimulatedPacket {
  const { sequenceNumber, sentAtMs } = packet;
  const lossRate = settings.lossPercent / 100;
  if (unitHash(settings.seed, sequenceNumber, LOSS_CHANNEL) < lossRate) {
    return { ...packet, status: 'lost', arrivalAtMs: null, playoutAtMs: null, reordered: false };
  }

  const extraDelayMs = unitHash(settings.seed, sequenceNumber, JITTER_CHANNEL) * settings.jitterMs;
  const arrivalAtMs = sentAtMs + settings.delayMs + extraDelayMs;

  if (settings.bufferMs <= 0) {
    return { ...packet, status: 'on-time', arrivalAtMs, playoutAtMs: arrivalAtMs, reordered: false };
  }

  const deadlineMs = sentAtMs + settings.delayMs + settings.bufferMs;
  const onTime = arrivalAtMs <= deadlineMs;
  return {
    ...packet,
    status: onTime ? 'on-time' : 'late',
    arrivalAtMs,
    playoutAtMs: onTime ? deadlineMs : null,
    reordered: false,
  };
}

export function simulate(frameCount: number, settings: NetworkSettings): SimulationResult {
  const delivered = createPackets(frameCount).map((packet) => deliver(packet, settings));
  const packets = markReordered(delivered);
  return { packets, metrics: computeMetrics(packets, settings.bufferMs > 0) };
}
