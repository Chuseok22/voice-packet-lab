import type { Metrics, SimulatedPacket } from './types';

function arrivalOrder(packets: SimulatedPacket[]): SimulatedPacket[] {
  return packets
    .filter((packet) => packet.arrivalAtMs !== null)
    .sort(
      (a, b) =>
        (a.arrivalAtMs ?? 0) - (b.arrivalAtMs ?? 0) || a.sequenceNumber - b.sequenceNumber,
    );
}

export function markReordered(packets: SimulatedPacket[]): SimulatedPacket[] {
  const reordered = new Set<number>();
  let highestSequenceSeen = Number.NEGATIVE_INFINITY;
  for (const packet of arrivalOrder(packets)) {
    if (packet.sequenceNumber < highestSequenceSeen) {
      reordered.add(packet.sequenceNumber);
    } else {
      highestSequenceSeen = packet.sequenceNumber;
    }
  }
  return packets.map((packet) =>
    reordered.has(packet.sequenceNumber) ? { ...packet, reordered: true } : packet,
  );
}

export function computeMetrics(packets: SimulatedPacket[], bufferEnabled: boolean): Metrics {
  const lost = packets.filter((packet) => packet.status === 'lost').length;
  const latencies = packets.flatMap((packet) =>
    packet.playoutAtMs === null ? [] : [packet.playoutAtMs - packet.sentAtMs],
  );
  const latencySum = latencies.reduce((sum, latency) => sum + latency, 0);
  return {
    lossRatio: packets.length === 0 ? 0 : lost / packets.length,
    averageLatencyMs: latencies.length === 0 ? null : latencySum / latencies.length,
    lateDropped: bufferEnabled ? packets.filter((packet) => packet.status === 'late').length : null,
    reordered: packets.filter((packet) => packet.reordered).length,
  };
}
