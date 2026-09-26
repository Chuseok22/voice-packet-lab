import {
  CloseCode,
  GATEWAY_PATH,
  GATEWAY_VERSION,
  Opcode,
  type ClientMessage,
  type HeartbeatMessage,
  type IdentifyMessage,
  type ServerMessage,
} from '@voice-packet-lab/shared';
import { connectionContent } from '../../content/connection';
import { parseServerFrame } from './parseServerFrame';

export type SocketLike = Pick<
  WebSocket,
  'readyState' | 'send' | 'close' | 'onopen' | 'onmessage' | 'onclose' | 'onerror'
>;

export interface GatewayHandlers {
  onHandshake(request: string, response: string): void;
  onMessage(message: ServerMessage): void;
  onSent(message: ClientMessage): void;
  onHeartbeatAck(rttMs: number): void;
  onFailure(reason: string, handshakeSeen: boolean): void;
}

export interface GatewayClientOptions {
  url?: string;
  connectTimeoutMs?: number;
  createSocket?: (url: string) => SocketLike;
  now?: () => number;
}

export interface GatewayConnection {
  sendIdentify(): void;
  close(): void;
}

interface Heartbeat {
  start(intervalMs: number): void;
  acknowledge(sentAt: number): void;
  stop(): void;
}

const DEFAULT_CONNECT_TIMEOUT_MS = 3000;
const MIN_HEARTBEAT_INTERVAL_MS = 1000;
const SOCKET_OPEN = 1;

export const DEMO_IDENTIFY_MESSAGE: IdentifyMessage = {
  op: Opcode.Identify,
  d: {
    server_id: '111111111111111111',
    user_id: '222222222222222222',
    session_id: 'demo-session',
    token: 'demo-token',
  },
};

export function defaultGatewayUrl(location: Pick<Location, 'protocol' | 'host'>): string {
  const scheme = location.protocol === 'https:' ? 'wss' : 'ws';
  return `${scheme}://${location.host}${GATEWAY_PATH}?v=${GATEWAY_VERSION}`;
}

function createHeartbeat(socket: SocketLike, handlers: GatewayHandlers, now: () => number): Heartbeat {
  const pendingHeartbeats = new Set<number>();
  let heartbeatTimer: ReturnType<typeof setInterval> | undefined;

  const send = () => {
    const t = now();
    const message: HeartbeatMessage = { op: Opcode.Heartbeat, d: { t, seq_ack: 0 } };
    pendingHeartbeats.add(t);
    socket.send(JSON.stringify(message));
    handlers.onSent(message);
  };

  return {
    start(intervalMs) {
      send();
      heartbeatTimer = setInterval(send, Math.max(MIN_HEARTBEAT_INTERVAL_MS, intervalMs));
    },
    acknowledge(sentAt) {
      if (pendingHeartbeats.delete(sentAt)) handlers.onHeartbeatAck(Math.max(0, now() - sentAt));
    },
    stop() {
      clearInterval(heartbeatTimer);
    },
  };
}

function openSocket(options: GatewayClientOptions): SocketLike {
  const url = options.url ?? defaultGatewayUrl(window.location);
  return (options.createSocket ?? ((target: string) => new WebSocket(target)))(url);
}

function detachSocket(socket: SocketLike): void {
  socket.onopen = null;
  socket.onmessage = null;
  socket.onclose = null;
  socket.onerror = null;
}

function routeServerMessage(message: ServerMessage, handlers: GatewayHandlers, heartbeat: Heartbeat): void {
  handlers.onMessage(message);
  if (message.op === Opcode.Hello) heartbeat.start(message.d.heartbeat_interval);
  else if (message.op === Opcode.HeartbeatAck) heartbeat.acknowledge(message.d.t);
}

function createIdentifySender(socket: SocketLike, handlers: GatewayHandlers, isFinished: () => boolean): () => void {
  let identifySent = false;
  return () => {
    if (isFinished() || identifySent || socket.readyState !== SOCKET_OPEN) return;
    identifySent = true;
    socket.send(JSON.stringify(DEMO_IDENTIFY_MESSAGE));
    handlers.onSent(DEMO_IDENTIFY_MESSAGE);
  };
}

function closeReason(code: number, handshakeSeen: boolean): string {
  if (!handshakeSeen) return connectionContent.errors.unreachable;
  return code === CloseCode.SessionTimeout ? connectionContent.errors.identifyTimeout : connectionContent.errors.dropped;
}

export function connectGateway(handlers: GatewayHandlers, options: GatewayClientOptions = {}): GatewayConnection {
  const now = options.now ?? Date.now;
  const socket = openSocket(options);
  const heartbeat = createHeartbeat(socket, handlers, now);
  let handshakeSeen = false;
  let finished = false;

  const cleanup = () => {
    finished = true;
    clearTimeout(connectTimer);
    heartbeat.stop();
    detachSocket(socket);
  };

  const fail = (reason: string) => {
    if (finished) return;
    cleanup();
    socket.close();
    handlers.onFailure(reason, handshakeSeen);
  };

  const connectTimer = setTimeout(() => {
    if (!handshakeSeen) fail(connectionContent.errors.timeout);
  }, options.connectTimeoutMs ?? DEFAULT_CONNECT_TIMEOUT_MS);

  socket.onmessage = (event) => {
    const frame = typeof event.data === 'string' ? parseServerFrame(event.data) : null;
    if (!frame) {
      fail(connectionContent.errors.badFrame);
    } else if ('type' in frame) {
      handshakeSeen = true;
      clearTimeout(connectTimer);
      handlers.onHandshake(frame.request, frame.response);
    } else {
      routeServerMessage(frame, handlers, heartbeat);
    }
  };
  socket.onerror = () => fail(connectionContent.errors.unreachable);
  socket.onclose = (event) => fail(closeReason(event.code, handshakeSeen));

  return {
    sendIdentify: createIdentifySender(socket, handlers, () => finished),
    close() {
      if (finished) return;
      cleanup();
      socket.close();
    },
  };
}
