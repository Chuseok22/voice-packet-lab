import { CloseCode, GATEWAY_PATH, POLICY_VIOLATION_CLOSE, type ServerFrame } from '@voice-packet-lab/shared';
import type { IncomingMessage, Server } from 'node:http';
import type { Duplex } from 'node:stream';
import { WebSocketServer, type RawData, type WebSocket } from 'ws';
import { createGatewaySession, type GatewayAction, type GatewaySession } from './gateway';
import { formatUpgradeRequest, formatUpgradeResponse } from './handshake';
import { logError, logInfo } from './logger';
import { createRateLimiter, type RateLimiter } from './rateLimiter';

const DEFAULT_MAX_PAYLOAD_BYTES = 4096;
const DEFAULT_MESSAGES_PER_SECOND = 20;
const DEFAULT_IDENTIFY_TIMEOUT_MS = 10_000;
const DEFAULT_IDLE_TIMEOUT_MS = 60_000;

export interface GatewayOptions {
  allowedOrigins: readonly string[];
  maxConnections: number;
  maxPayloadBytes?: number;
  messagesPerSecond?: number;
  identifyTimeoutMs?: number;
  idleTimeoutMs?: number;
}

export interface GatewayHandle {
  close(): Promise<void>;
  activeConnections(): number;
}

/** 브라우저는 항상 Origin을 보내므로, Origin이 없는 요청은 브라우저가 아닌 클라이언트(테스트, curl)로 보고 허용한다. */
export function isOriginAllowed(
  origin: string | undefined,
  host: string | undefined,
  allowedOrigins: readonly string[],
): boolean {
  if (origin === undefined) return true;
  if (allowedOrigins.length > 0) return allowedOrigins.includes(origin);
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

function rejectUpgrade(socket: Duplex, status: number, reason: string): void {
  socket.once('finish', () => socket.destroy());
  socket.end(`HTTP/1.1 ${status} ${reason}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`);
}

interface ConnectionSettings {
  messagesPerSecond: number;
  identifyTimeoutMs: number;
  idleTimeoutMs: number;
}

function sendFrame(socket: WebSocket, frame: ServerFrame): void {
  socket.send(JSON.stringify(frame));
}

function runActions(socket: WebSocket, actions: GatewayAction[]): void {
  for (const action of actions) {
    if (action.kind === 'send') sendFrame(socket, action.message);
    else socket.close(action.code, action.reason);
  }
}

function handleMessage(
  socket: WebSocket,
  session: GatewaySession,
  limiter: RateLimiter,
  data: RawData,
  isBinary: boolean,
): void {
  if (!limiter.allow(Date.now())) {
    socket.close(POLICY_VIOLATION_CLOSE, 'Rate limited');
    return;
  }
  if (isBinary) {
    socket.close(CloseCode.DecodeFailed, 'Failed to decode payload');
    return;
  }
  runActions(socket, session.receive(data.toString()));
}

function startConnectionTimers(
  socket: WebSocket,
  session: GatewaySession,
  settings: ConnectionSettings,
): { refreshIdleTimer(): void; clearTimers(): void } {
  const identifyTimer = setTimeout(() => runActions(socket, session.identifyTimeout()), settings.identifyTimeoutMs);
  let idleTimer: NodeJS.Timeout | undefined;
  const refreshIdleTimer = () => {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => socket.close(CloseCode.SessionTimeout, 'Session timeout'), settings.idleTimeoutMs);
  };
  refreshIdleTimer();
  return {
    refreshIdleTimer,
    clearTimers: () => {
      clearTimeout(identifyTimer);
      clearTimeout(idleTimer);
    },
  };
}

function registerConnection(
  wss: WebSocketServer,
  socket: WebSocket,
  request: IncomingMessage,
  responseText: string,
  settings: ConnectionSettings,
): void {
  const session = createGatewaySession();
  const limiter = createRateLimiter(settings.messagesPerSecond);
  const timers = startConnectionTimers(socket, session, settings);

  socket.on('message', (data: RawData, isBinary: boolean) => {
    timers.refreshIdleTimer();
    handleMessage(socket, session, limiter, data, isBinary);
  });

  socket.on('error', (error: NodeJS.ErrnoException) => {
    logError('gateway socket error', { code: error.code ?? 'unknown' });
  });

  socket.on('close', () => {
    timers.clearTimers();
    logInfo('gateway disconnected', { active: wss.clients.size });
  });

  sendFrame(socket, {
    type: 'handshake',
    request: formatUpgradeRequest(
      request.method ?? 'GET',
      request.url ?? GATEWAY_PATH,
      request.httpVersion,
      request.rawHeaders,
    ),
    response: responseText,
  });
  runActions(socket, session.start());
  logInfo('gateway connected', { active: wss.clients.size });
}

/** 업그레이드 요청을 검사해 거절할 상태 코드를 돌려준다. 통과하면 null. */
function findUpgradeRejection(
  request: IncomingMessage,
  options: GatewayOptions,
  activeConnections: number,
): { status: number; reason: string } | null {
  let pathname: string;
  try {
    pathname = new URL(request.url ?? '/', 'http://localhost').pathname;
  } catch {
    return { status: 400, reason: 'Bad Request' };
  }
  if (pathname !== GATEWAY_PATH) return { status: 404, reason: 'Not Found' };
  if (!isOriginAllowed(request.headers.origin, request.headers.host, options.allowedOrigins)) {
    return { status: 403, reason: 'Forbidden' };
  }
  if (activeConnections >= options.maxConnections) return { status: 503, reason: 'Service Unavailable' };
  return null;
}

export function attachGateway(server: Server, options: GatewayOptions): GatewayHandle {
  const settings: ConnectionSettings = {
    messagesPerSecond: options.messagesPerSecond ?? DEFAULT_MESSAGES_PER_SECOND,
    identifyTimeoutMs: options.identifyTimeoutMs ?? DEFAULT_IDENTIFY_TIMEOUT_MS,
    idleTimeoutMs: options.idleTimeoutMs ?? DEFAULT_IDLE_TIMEOUT_MS,
  };
  const wss = new WebSocketServer({ noServer: true, maxPayload: options.maxPayloadBytes ?? DEFAULT_MAX_PAYLOAD_BYTES });
  const responseTexts = new WeakMap<IncomingMessage, string>();

  wss.on('headers', (headerLines, request) => {
    responseTexts.set(request, formatUpgradeResponse(headerLines));
  });

  wss.on('connection', (socket: WebSocket, request: IncomingMessage) => {
    registerConnection(wss, socket, request, responseTexts.get(request) ?? '', settings);
  });

  server.on('upgrade', (request, socket, head) => {
    const rejection = findUpgradeRejection(request, options, wss.clients.size);
    if (rejection) {
      rejectUpgrade(socket, rejection.status, rejection.reason);
      return;
    }
    wss.handleUpgrade(request, socket, head, (webSocket) => wss.emit('connection', webSocket, request));
  });

  return {
    activeConnections: () => wss.clients.size,
    close: () =>
      new Promise<void>((resolve) => {
        wss.clients.forEach((client) => client.terminate());
        wss.close(() => resolve());
      }),
  };
}
