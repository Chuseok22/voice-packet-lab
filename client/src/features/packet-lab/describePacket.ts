import { packetLabContent } from '../../content/packetLab';
import type { NetworkSettings, SimulatedPacket } from '../../engine/types';

export function describePacket(packet: SimulatedPacket, settings: NetworkSettings): string {
  const { explain } = packetLabContent;
  const { sequenceNumber } = packet;
  if (packet.status === 'lost') {
    return explain.lost(sequenceNumber);
  }

  const travelMs = Math.round((packet.arrivalAtMs ?? packet.sentAtMs) - packet.sentAtMs);
  if (packet.status === 'late') {
    const deadlineMs = settings.delayMs + settings.bufferMs;
    return explain.late(sequenceNumber, deadlineMs, Math.max(1, travelMs - deadlineMs));
  }
  if (packet.reordered) {
    return settings.bufferMs > 0
      ? explain.reorderedBufferOn(sequenceNumber)
      : explain.reorderedBufferOff(sequenceNumber);
  }
  if (settings.bufferMs > 0) {
    const playoutMs = Math.round((packet.playoutAtMs ?? packet.sentAtMs) - packet.sentAtMs);
    return explain.onTimeBufferOn(sequenceNumber, travelMs, playoutMs);
  }
  return explain.onTimeBufferOff(sequenceNumber, travelMs);
}
