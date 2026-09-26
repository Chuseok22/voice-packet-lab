import { CloseCode, Opcode } from '@voice-packet-lab/shared';
import { connectionContent } from '../../content/connection';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { connectGateway, defaultGatewayUrl, type GatewayHandlers, type SocketLike } from './gatewayClient';

class FakeSocket {
  readyState = 0;
  sent: string[] = [];
  closeCalls = 0;
  onopen: ((event: Event) => unknown) | null = null;
  onmessage: ((event: MessageEvent) => unknown) | null = null;
  onclose: ((event: CloseEvent) => unknown) | null = null;
  onerror: ((event: Event) => unknown) | null = null;

  send(data: string): void {
    this.sent.push(data);
  }

  close(): void {
    this.closeCalls += 1;
    this.readyState = 3;
  }

  open(): void {
    this.readyState = 1;
    this.onopen?.(new Event('open'));
  }

  receive(frame: unknown): void {
    this.onmessage?.(new MessageEvent('message', { data: JSON.stringify(frame) }));
  }

  drop(code = 1006): void {
    this.readyState = 3;
    this.onclose?.(new CloseEvent('close', { code }));
  }

  fail(): void {
    this.onerror?.(new Event('error'));
  }
}

const HANDSHAKE = { type: 'handshake', request: 'GET /', response: 'HTTP/1.1 101 Switching Protocols' };
const HELLO = { op: Opcode.Hello, d: { heartbeat_interval: 5000 } };

function setup(nowValues: number[] = []) {
  const socket = new FakeSocket();
  const handlers: GatewayHandlers = {
    onHandshake: vi.fn(),
    onMessage: vi.fn(),
    onSent: vi.fn(),
    onHeartbeatAck: vi.fn(),
    onFailure: vi.fn(),
  };
  const clock = nowValues.slice();
  const connection = connectGateway(handlers, {
    url: 'ws://test/ws/voice-gateway?v=8',
    createSocket: () => socket as unknown as SocketLike,
    now: () => clock.shift() ?? 0,
  });
  return { socket, handlers, connection };
}

describe('defaultGatewayUrl', () => {
  it('uses wss on https and ws otherwise', () => {
    expect(defaultGatewayUrl({ protocol: 'https:', host: 'lab.example.com' })).toBe('wss://lab.example.com/ws/voice-gateway?v=8');
    expect(defaultGatewayUrl({ protocol: 'http:', host: 'localhost:5173' })).toBe('ws://localhost:5173/ws/voice-gateway?v=8');
  });
});

describe('connectGateway', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('reports the handshake, then Hello, and starts heartbeating immediately and on an interval', () => {
    const { socket, handlers } = setup([1000, 6000]);
    socket.open();
    socket.receive(HANDSHAKE);
    expect(handlers.onHandshake).toHaveBeenCalledWith('GET /', 'HTTP/1.1 101 Switching Protocols');

    socket.receive(HELLO);
    expect(handlers.onMessage).toHaveBeenCalledWith(HELLO);
    expect(socket.sent).toEqual([JSON.stringify({ op: Opcode.Heartbeat, d: { t: 1000, seq_ack: 0 } })]);
    expect(handlers.onSent).toHaveBeenCalledWith({ op: Opcode.Heartbeat, d: { t: 1000, seq_ack: 0 } });

    vi.advanceTimersByTime(5000);
    expect(socket.sent).toHaveLength(2);
  });

  it('turns a matching ACK into an RTT and ignores unknown ones', () => {
    const { socket, handlers } = setup([1000, 1042]);
    socket.open();
    socket.receive(HANDSHAKE);
    socket.receive(HELLO);
    socket.receive({ op: Opcode.HeartbeatAck, d: { t: 999 } });
    expect(handlers.onHeartbeatAck).not.toHaveBeenCalled();
    socket.receive({ op: Opcode.HeartbeatAck, d: { t: 1000 } });
    expect(handlers.onHeartbeatAck).toHaveBeenCalledWith(42);
  });

  it('never heartbeats faster than once a second even if the server asks', () => {
    const { socket } = setup();
    socket.open();
    socket.receive(HANDSHAKE);
    socket.receive({ op: Opcode.Hello, d: { heartbeat_interval: 0 } });
    expect(socket.sent).toHaveLength(1);
    vi.advanceTimersByTime(999);
    expect(socket.sent).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(socket.sent).toHaveLength(2);
  });

  it('sends Identify only while the socket is open', () => {
    const { socket, handlers, connection } = setup();
    connection.sendIdentify();
    expect(socket.sent).toHaveLength(0);

    socket.open();
    socket.receive(HANDSHAKE);
    connection.sendIdentify();
    expect(JSON.parse(socket.sent[0])).toMatchObject({ op: Opcode.Identify, d: { token: 'demo-token' } });
    expect(handlers.onSent).toHaveBeenCalledWith(expect.objectContaining({ op: Opcode.Identify }));
  });

  it('sends Identify only once even if the button is clicked repeatedly (a second one makes the server close with 4005)', () => {
    const { socket, connection } = setup();
    socket.open();
    socket.receive(HANDSHAKE);
    connection.sendIdentify();
    connection.sendIdentify();
    expect(socket.sent.filter((frame) => JSON.parse(frame).op === Opcode.Identify)).toHaveLength(1);
  });

  it('fails once with handshakeSeen=false when no handshake arrives in time', () => {
    const { socket, handlers } = setup();
    vi.advanceTimersByTime(3000);
    expect(handlers.onFailure).toHaveBeenCalledTimes(1);
    expect(handlers.onFailure).toHaveBeenCalledWith(expect.any(String), false);
    expect(socket.closeCalls).toBe(1);
    socket.drop();
    expect(handlers.onFailure).toHaveBeenCalledTimes(1);
  });

  it('fails once when the socket errors before the handshake (error is followed by close)', () => {
    const { socket, handlers } = setup();
    socket.fail();
    socket.drop();
    expect(handlers.onFailure).toHaveBeenCalledTimes(1);
    expect(handlers.onFailure).toHaveBeenCalledWith(expect.any(String), false);
  });

  it('fails with handshakeSeen=true when the server drops the connection later', () => {
    const { socket, handlers } = setup();
    socket.open();
    socket.receive(HANDSHAKE);
    vi.advanceTimersByTime(10_000);
    expect(handlers.onFailure).not.toHaveBeenCalled();
    socket.drop();
    expect(handlers.onFailure).toHaveBeenCalledWith(expect.any(String), true);
  });

  it('explains the Identify timeout when the server closes with 4009 after the handshake', () => {
    const { socket, handlers } = setup();
    socket.open();
    socket.receive(HANDSHAKE);
    socket.drop(CloseCode.SessionTimeout);
    expect(handlers.onFailure).toHaveBeenCalledWith(connectionContent.errors.identifyTimeout, true);
  });

  it('keeps the generic dropped message for other close codes after the handshake', () => {
    const { socket, handlers } = setup();
    socket.open();
    socket.receive(HANDSHAKE);
    socket.drop(CloseCode.NotAuthenticated);
    expect(handlers.onFailure).toHaveBeenCalledWith(connectionContent.errors.dropped, true);
  });

  it('treats an unreadable frame as a failure', () => {
    const { socket, handlers } = setup();
    socket.open();
    socket.onmessage?.(new MessageEvent('message', { data: 'garbage' }));
    expect(handlers.onFailure).toHaveBeenCalledTimes(1);
    expect(socket.closeCalls).toBe(1);
  });

  it('cleans up timers and callbacks on close()', () => {
    const { socket, handlers, connection } = setup();
    socket.open();
    socket.receive(HANDSHAKE);
    socket.receive(HELLO);
    connection.close();
    const sentBefore = socket.sent.length;
    vi.advanceTimersByTime(60_000);
    expect(socket.sent).toHaveLength(sentBefore);
    expect(handlers.onFailure).not.toHaveBeenCalled();
    expect(socket.closeCalls).toBe(1);
    socket.receive(HELLO);
    expect(handlers.onMessage).toHaveBeenCalledTimes(1);
  });
});
