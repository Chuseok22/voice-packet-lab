export const GATEWAY_PATH = '/ws/voice-gateway';
export const GATEWAY_VERSION = 8;

export const Opcode = {
  Identify: 0,
  SelectProtocol: 1,
  Ready: 2,
  Heartbeat: 3,
  SessionDescription: 4,
  HeartbeatAck: 6,
  Hello: 8,
} as const;

export const CloseCode = {
  UnknownOpcode: 4001,
  DecodeFailed: 4002,
  NotAuthenticated: 4003,
  AlreadyAuthenticated: 4005,
  SessionTimeout: 4009,
} as const;

/** WebSocket 표준 종료 코드 1008 (정책 위반). 속도 제한 초과에 쓴다. */
export const POLICY_VIOLATION_CLOSE = 1008;

const OPCODE_NAMES: Readonly<Record<number, string>> = {
  [Opcode.Identify]: 'Identify',
  [Opcode.SelectProtocol]: 'Select Protocol',
  [Opcode.Ready]: 'Ready',
  [Opcode.Heartbeat]: 'Heartbeat',
  [Opcode.SessionDescription]: 'Session Description',
  [Opcode.HeartbeatAck]: 'Heartbeat ACK',
  [Opcode.Hello]: 'Hello',
};

export function opcodeName(op: number): string {
  return OPCODE_NAMES[op] ?? `op ${op}`;
}

export interface IdentifyPayload {
  server_id: string;
  user_id: string;
  session_id: string;
  token: string;
  max_dave_protocol_version?: number;
}

export interface HeartbeatPayload {
  t: number;
  seq_ack: number;
}

export interface HeartbeatAckPayload {
  t: number;
}

export interface ReadyPayload {
  ssrc: number;
  ip: string;
  port: number;
  modes: string[];
}

export interface IdentifyMessage {
  op: typeof Opcode.Identify;
  d: IdentifyPayload;
}

export interface HeartbeatMessage {
  op: typeof Opcode.Heartbeat;
  d: HeartbeatPayload;
}

export interface HelloMessage {
  op: typeof Opcode.Hello;
  d: { heartbeat_interval: number };
}

export interface ReadyMessage {
  op: typeof Opcode.Ready;
  d: ReadyPayload;
}

export interface HeartbeatAckMessage {
  op: typeof Opcode.HeartbeatAck;
  d: HeartbeatAckPayload;
}

/** 서버가 연결 직후 첫 프레임으로 보내는 학습용 메타 프레임 (Discord 프로토콜이 아님). */
export interface HandshakeMessage {
  type: 'handshake';
  request: string;
  response: string;
}

export type ClientMessage = IdentifyMessage | HeartbeatMessage;
export type ServerMessage = HelloMessage | ReadyMessage | HeartbeatAckMessage;
export type ServerFrame = HandshakeMessage | ServerMessage;
