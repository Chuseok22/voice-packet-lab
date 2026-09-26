import { CloseCode, Opcode } from '@voice-packet-lab/shared';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import WebSocket from 'ws';
import { attachGateway, isOriginAllowed } from './gatewayServer';

let server: Server;
let gateway: ReturnType<typeof attachGateway>;
let port: number;

beforeAll(async () => {
  server = createServer((_, response) => response.end('http'));
  gateway = attachGateway(server, {
    allowedOrigins: [],
    maxConnections: 3,
    identifyTimeoutMs: 300,
    idleTimeoutMs: 2000,
    messagesPerSecond: 5,
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  port = (server.address() as AddressInfo).port;
});

afterAll(async () => {
  await gateway.close();
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

// 서버 쪽 소켓 정리는 클라이언트의 close 이벤트보다 몇 ms 늦으므로, 이전 테스트의 연결이 사라질 때까지 기다린다.
beforeEach(async () => {
  await vi.waitFor(() => expect(gateway.activeConnections()).toBe(0));
});

interface Client {
  ws: WebSocket;
  next(): Promise<unknown>;
  closed: Promise<{ code: number; reason: string }>;
}

function connect(headers: Record<string, string> = {}, target = '/ws/voice-gateway?v=8'): Promise<Client> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}${target}`, {
      headers: { Origin: `http://127.0.0.1:${port}`, ...headers },
    });
    const queue: unknown[] = [];
    const waiters: Array<(value: unknown) => void> = [];
    ws.on('message', (data) => {
      const frame: unknown = JSON.parse(data.toString());
      const waiter = waiters.shift();
      if (waiter) waiter(frame);
      else queue.push(frame);
    });
    ws.on('error', () => undefined);
    const closed = new Promise<{ code: number; reason: string }>((done) => {
      ws.on('close', (code, reason) => done({ code, reason: reason.toString() }));
    });
    ws.on('open', () =>
      resolve({
        ws,
        closed,
        next: () => (queue.length > 0 ? Promise.resolve(queue.shift()) : new Promise((done) => waiters.push(done))),
      }),
    );
    ws.on('unexpected-response', (request, response) => {
      response.resume();
      request.destroy();
      reject(new Error(`status ${response.statusCode}`));
    });
  });
}

function rejectedStatus(headers: Record<string, string>, target = '/ws/voice-gateway'): Promise<string> {
  return connect(headers, target).then(
    async (client) => {
      client.ws.close();
      await client.closed;
      return 'connected';
    },
    (error: Error) => error.message,
  );
}

describe('isOriginAllowed', () => {
  it('allows a missing origin (non-browser clients)', () => {
    expect(isOriginAllowed(undefined, 'lab.example.com', [])).toBe(true);
  });

  it('requires same-origin when no list is configured', () => {
    expect(isOriginAllowed('https://lab.example.com', 'lab.example.com', [])).toBe(true);
    expect(isOriginAllowed('https://evil.example', 'lab.example.com', [])).toBe(false);
    expect(isOriginAllowed('not a url', 'lab.example.com', [])).toBe(false);
  });

  it('uses the configured list when present', () => {
    expect(isOriginAllowed('https://a.example', 'x', ['https://a.example'])).toBe(true);
    expect(isOriginAllowed('https://lab.example.com', 'lab.example.com', ['https://a.example'])).toBe(false);
  });
});

describe('gateway server', () => {
  it('sends the captured handshake first, then Hello', async () => {
    const client = await connect({ Cookie: 'session=secret', 'X-Forwarded-For': '203.0.113.9' });
    const handshake = (await client.next()) as { type: string; request: string; response: string };
    expect(handshake.type).toBe('handshake');
    expect(handshake.request).toContain('GET /ws/voice-gateway?v=8 HTTP/1.1');
    expect(handshake.request).toContain('Upgrade: websocket');
    expect(handshake.request).toContain('Sec-WebSocket-Key:');
    expect(handshake.request).not.toMatch(/cookie|secret|forwarded|203\.0\.113/i);
    expect(handshake.response).toContain('HTTP/1.1 101 Switching Protocols');
    expect(handshake.response).toContain('Sec-WebSocket-Accept:');

    expect(await client.next()).toEqual({ op: Opcode.Hello, d: { heartbeat_interval: 5000 } });
    client.ws.close();
    await client.closed;
  });

  it('completes Hello, Identify, Ready and heartbeat round trips', async () => {
    const client = await connect();
    await client.next();
    await client.next();
    client.ws.send(JSON.stringify({ op: Opcode.Identify, d: { server_id: '1', user_id: '2', session_id: 's', token: 't' } }));
    expect(await client.next()).toMatchObject({ op: Opcode.Ready });
    client.ws.send(JSON.stringify({ op: Opcode.Heartbeat, d: { t: 1234, seq_ack: 0 } }));
    expect(await client.next()).toEqual({ op: Opcode.HeartbeatAck, d: { t: 1234 } });
    client.ws.close();
    await client.closed;
  });

  it('rejects other paths, foreign origins and connections over the limit', async () => {
    expect(await rejectedStatus({}, '/other')).toBe('status 404');
    expect(await rejectedStatus({ Origin: 'http://evil.example' })).toBe('status 403');

    const held = await Promise.all([connect(), connect(), connect()]);
    expect(await rejectedStatus({})).toBe('status 503');
    held.forEach((client) => client.ws.close());
    await Promise.all(held.map((client) => client.closed));
  });

  it('closes binary frames with 4002', async () => {
    const client = await connect();
    client.ws.send(Buffer.from([1, 2, 3]));
    expect((await client.closed).code).toBe(CloseCode.DecodeFailed);
  });

  it('closes invalid JSON with 4002', async () => {
    const client = await connect();
    client.ws.send('not json');
    expect((await client.closed).code).toBe(CloseCode.DecodeFailed);
  });

  it('closes payloads over 4KB with 1009', async () => {
    const client = await connect();
    client.ws.send('x'.repeat(5000));
    expect((await client.closed).code).toBe(1009);
  });

  it('closes a flooding client with 1008', async () => {
    const client = await connect();
    for (let index = 0; index < 12; index += 1) {
      client.ws.send(JSON.stringify({ op: Opcode.Heartbeat, d: { t: index, seq_ack: 0 } }));
    }
    expect((await client.closed).code).toBe(1008);
  });

  it('closes with 4009 when Identify never arrives', async () => {
    const client = await connect();
    expect((await client.closed).code).toBe(CloseCode.SessionTimeout);
  });

  it('keeps serving after abusive clients', async () => {
    const client = await connect();
    await client.next();
    expect(await client.next()).toMatchObject({ op: Opcode.Hello });
    client.ws.close();
    await client.closed;
    await vi.waitFor(() => expect(gateway.activeConnections()).toBe(0));
  });
});
