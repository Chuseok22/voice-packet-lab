import type { HeartbeatAckMessage, HeartbeatMessage, HelloMessage, ReadyMessage } from '@voice-packet-lab/shared';

export interface ConnectionSnapshot {
  request: string;
  response: string;
  hello: HelloMessage;
  ready: ReadyMessage;
  heartbeat: { sent: HeartbeatMessage; ack: HeartbeatAckMessage; rttMs: number };
}
