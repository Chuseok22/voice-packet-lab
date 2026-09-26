import { FRAME_MS } from '../../engine/constants';
import type { PacketStatus, SimulatedPacket } from '../../engine/types';

export const PX_PER_MS = 2;
export const LEFT_GUTTER = 56;
export const CELL_WIDTH = 34;
export const CELL_HEIGHT = 24;
export const SENDER_Y = 46;
export const RECEIVER_Y = 138;
export const SVG_HEIGHT = 190;

export const xOf = (milliseconds: number): number => LEFT_GUTTER + milliseconds * PX_PER_MS;

export interface SenderCell {
  sequenceNumber: number;
  x: number;
}

export interface ReceiverCell {
  sequenceNumber: number;
  x: number;
  status: PacketStatus;
  reordered: boolean;
}

export interface LaneLine {
  sequenceNumber: number;
  x1: number;
  x2: number;
  late: boolean;
}

export interface LaneLayout {
  width: number;
  senders: SenderCell[];
  receivers: ReceiverCell[];
  lines: LaneLine[];
}

export function buildLaneLayout(packets: SimulatedPacket[], nominalDelayMs: number): LaneLayout {
  const receiverMs = (packet: SimulatedPacket): number => packet.arrivalAtMs ?? packet.sentAtMs + nominalDelayMs;
  const endMs = packets.reduce((latest, packet) => Math.max(latest, receiverMs(packet), packet.sentAtMs), 0);

  return {
    width: xOf(endMs + FRAME_MS) + CELL_WIDTH,
    senders: packets.map((packet) => ({ sequenceNumber: packet.sequenceNumber, x: xOf(packet.sentAtMs) })),
    receivers: packets.map((packet) => ({
      sequenceNumber: packet.sequenceNumber,
      x: xOf(receiverMs(packet)),
      status: packet.status,
      reordered: packet.reordered,
    })),
    lines: packets.flatMap((packet) =>
      packet.arrivalAtMs === null
        ? []
        : [
            {
              sequenceNumber: packet.sequenceNumber,
              x1: xOf(packet.sentAtMs) + CELL_WIDTH / 2,
              x2: xOf(packet.arrivalAtMs) + CELL_WIDTH / 2,
              late: packet.status === 'late',
            },
          ],
    ),
  };
}
