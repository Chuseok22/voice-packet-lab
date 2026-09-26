export interface NetworkSettings {
  lossPercent: number;
  delayMs: number;
  jitterMs: number;
  /** 0 이면 Jitter Buffer OFF */
  bufferMs: number;
  seed: number;
}

export interface RtpPacket {
  sequenceNumber: number;
  timestamp: number;
  ssrc: number;
  sentAtMs: number;
}

export type PacketStatus = 'on-time' | 'late' | 'lost';

export interface SimulatedPacket extends RtpPacket {
  status: PacketStatus;
  arrivalAtMs: number | null;
  playoutAtMs: number | null;
  reordered: boolean;
}

export interface Metrics {
  lossRatio: number;
  averageLatencyMs: number | null;
  lateDropped: number | null;
  reordered: number;
}

export interface SimulationResult {
  packets: SimulatedPacket[];
  metrics: Metrics;
}
