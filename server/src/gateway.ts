import {
  CloseCode,
  Opcode,
  type IdentifyPayload,
  type HeartbeatPayload,
  type ReadyMessage,
  type ServerMessage,
} from '@voice-packet-lab/shared';

export const HEARTBEAT_INTERVAL_MS = 5000;
export const MAX_FIELD_LENGTH = 128;

export type GatewayState = 'awaiting-identify' | 'ready' | 'closed';

export type GatewayAction =
  | { kind: 'send'; message: ServerMessage }
  | { kind: 'close'; code: number; reason: string };

export interface GatewaySession {
  readonly state: GatewayState;
  start(): GatewayAction[];
  receive(raw: string): GatewayAction[];
  identifyTimeout(): GatewayAction[];
}

/** 화면 표시용 예시 값. ip는 문서용 예약 대역(RFC 5737)이고 modes는 알고리즘명을 노출하지 않는 중립 값이다. */
const EXAMPLE_READY: ReadyMessage = {
  op: Opcode.Ready,
  d: { ssrc: 1234567, ip: '203.0.113.10', port: 50000, modes: ['example_mode_a', 'example_mode_b'] },
};

interface Frame {
  op: number;
  d: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseFrame(raw: string): Frame | null {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(value) || typeof value.op !== 'number' || !Number.isInteger(value.op)) {
    return null;
  }
  return { op: value.op, d: value.d };
}

function isBoundedString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= MAX_FIELD_LENGTH;
}

function toIdentifyPayload(d: unknown): IdentifyPayload | null {
  if (!isRecord(d)) return null;
  const { server_id, user_id, session_id, token, max_dave_protocol_version } = d;
  if (!isBoundedString(server_id) || !isBoundedString(user_id) || !isBoundedString(session_id) || !isBoundedString(token)) {
    return null;
  }
  if (max_dave_protocol_version === undefined) {
    return { server_id, user_id, session_id, token };
  }
  return typeof max_dave_protocol_version === 'number' && Number.isInteger(max_dave_protocol_version) && max_dave_protocol_version >= 0
    ? { server_id, user_id, session_id, token, max_dave_protocol_version }
    : null;
}

function toHeartbeatPayload(d: unknown): HeartbeatPayload | null {
  if (!isRecord(d)) return null;
  const { t, seq_ack } = d;
  return typeof t === 'number' && Number.isFinite(t) && typeof seq_ack === 'number' && Number.isFinite(seq_ack)
    ? { t, seq_ack }
    : null;
}

export function createGatewaySession(): GatewaySession {
  let state: GatewayState = 'awaiting-identify';

  const close = (code: number, reason: string): GatewayAction[] => {
    state = 'closed';
    return [{ kind: 'close', code, reason }];
  };
  const decodeFailed = (): GatewayAction[] => close(CloseCode.DecodeFailed, 'Failed to decode payload');

  return {
    get state() {
      return state;
    },

    start(): GatewayAction[] {
      return [{ kind: 'send', message: { op: Opcode.Hello, d: { heartbeat_interval: HEARTBEAT_INTERVAL_MS } } }];
    },

    receive(raw: string): GatewayAction[] {
      if (state === 'closed') return [];
      const frame = parseFrame(raw);
      if (!frame) return decodeFailed();

      if (frame.op === Opcode.Heartbeat) {
        const heartbeat = toHeartbeatPayload(frame.d);
        return heartbeat
          ? [{ kind: 'send', message: { op: Opcode.HeartbeatAck, d: { t: heartbeat.t } } }]
          : decodeFailed();
      }

      if (frame.op === Opcode.Identify) {
        if (state === 'ready') return close(CloseCode.AlreadyAuthenticated, 'Already authenticated');
        if (!toIdentifyPayload(frame.d)) return decodeFailed();
        state = 'ready';
        return [{ kind: 'send', message: EXAMPLE_READY }];
      }

      return state === 'ready'
        ? close(CloseCode.UnknownOpcode, 'Unknown opcode')
        : close(CloseCode.NotAuthenticated, 'Not authenticated');
    },

    identifyTimeout(): GatewayAction[] {
      return state === 'awaiting-identify' ? close(CloseCode.SessionTimeout, 'Session timeout') : [];
    },
  };
}
