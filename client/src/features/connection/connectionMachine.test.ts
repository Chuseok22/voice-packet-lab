import { Opcode, type ReadyMessage } from '@voice-packet-lab/shared';
import { describe, expect, it } from 'vitest';
import { connectionReducer, initialConnectionState, stepStatuses, type ConnectionEvent, type ConnectionState } from './connectionMachine';

const HELLO = { op: Opcode.Hello, d: { heartbeat_interval: 5000 } } as const;
const READY: ReadyMessage = { op: Opcode.Ready, d: { ssrc: 1, ip: '203.0.113.10', port: 50000, modes: ['a'] } };
const HEARTBEAT = { op: Opcode.Heartbeat, d: { t: 1, seq_ack: 0 } } as const;
const ACK = { op: Opcode.HeartbeatAck, d: { t: 1 } } as const;
const IDENTIFY = {
  op: Opcode.Identify,
  d: { server_id: '1', user_id: '2', session_id: 's', token: 't' },
} as const;

function run(...events: ConnectionEvent[]): ConnectionState {
  return events.reduce(connectionReducer, initialConnectionState);
}

describe('connectionReducer', () => {
  it('walks through the connection phases', () => {
    expect(run({ type: 'connect-started' }).phase).toBe('connecting');
    const handshake = run(
      { type: 'connect-started' },
      { type: 'handshake-received', source: 'live', request: 'GET', response: '101' },
    );
    expect(handshake.phase).toBe('handshake');
    expect(handshake.handshake).toEqual({ request: 'GET', response: '101' });
    expect(handshake.source).toBe('live');

    const hello = connectionReducer(handshake, { type: 'server-message', message: HELLO });
    expect(hello.phase).toBe('hello');
    expect(hello.heartbeatIntervalMs).toBe(5000);

    const ready = connectionReducer(
      connectionReducer(hello, { type: 'client-message', message: IDENTIFY }),
      { type: 'server-message', message: READY },
    );
    expect(ready.phase).toBe('ready');
    expect(ready.log.map((entry) => [entry.direction, entry.name])).toEqual([
      ['received', 'Hello'],
      ['sent', 'Identify'],
      ['received', 'Ready'],
    ]);
  });

  it('pretty-prints message bodies', () => {
    const state = run({ type: 'server-message', message: HELLO });
    expect(state.log[0].body).toBe(JSON.stringify(HELLO, null, 2));
  });

  it('counts heartbeat ACKs and keeps the last RTT', () => {
    const state = run({ type: 'heartbeat-acked', rttMs: 40 }, { type: 'heartbeat-acked', rttMs: 25 });
    expect(state.heartbeatCount).toBe(2);
    expect(state.lastRttMs).toBe(25);
  });

  it('logs only the first three heartbeat pairs', () => {
    let state: ConnectionState = initialConnectionState;
    for (let round = 0; round < 6; round += 1) {
      state = connectionReducer(state, { type: 'client-message', message: HEARTBEAT });
      state = connectionReducer(state, { type: 'server-message', message: ACK });
      state = connectionReducer(state, { type: 'heartbeat-acked', rttMs: 10 });
    }
    expect(state.log).toHaveLength(6);
    expect(state.heartbeatCount).toBe(6);
  });

  it('caps the log length and gives entries unique ids', () => {
    let state: ConnectionState = initialConnectionState;
    for (let index = 0; index < 80; index += 1) {
      state = connectionReducer(state, { type: 'client-message', message: IDENTIFY });
    }
    expect(state.log).toHaveLength(50);
    expect(new Set(state.log.map((entry) => entry.id)).size).toBe(50);
  });

  it('records failures', () => {
    const failed = run({ type: 'connect-started' }, { type: 'failed', reason: '끊김' });
    expect(failed.phase).toBe('error');
    expect(failed.errorMessage).toBe('끊김');
  });

  it('does not mutate the previous state', () => {
    const before = run({ type: 'server-message', message: HELLO });
    const snapshot = JSON.stringify(before);
    connectionReducer(before, { type: 'client-message', message: IDENTIFY });
    expect(JSON.stringify(before)).toBe(snapshot);
  });
});

describe('stepStatuses', () => {
  const at = (...events: ConnectionEvent[]) => stepStatuses(run(...events));

  it('is all pending before connecting', () => {
    expect(at()).toEqual(Array(10).fill('pending'));
  });

  it('starts with TCP while connecting', () => {
    expect(at({ type: 'connect-started' })).toEqual(['active', ...Array(9).fill('pending')]);
  });

  it('completes the upgrade steps after the handshake and waits on Hello', () => {
    const statuses = at({ type: 'connect-started' }, { type: 'handshake-received', source: 'live', request: 'a', response: 'b' });
    expect(statuses.slice(0, 4)).toEqual(['done', 'done', 'done', 'done']);
    expect(statuses[4]).toBe('active');
  });

  it('waits for the user to send Identify after Hello', () => {
    const statuses = at(
      { type: 'handshake-received', source: 'live', request: 'a', response: 'b' },
      { type: 'server-message', message: HELLO },
    );
    expect(statuses[4]).toBe('done');
    expect(statuses[5]).toBe('active');
  });

  it('finishes everything once Ready and a heartbeat ACK have arrived', () => {
    const ready = [
      { type: 'handshake-received', source: 'live', request: 'a', response: 'b' },
      { type: 'server-message', message: HELLO },
      { type: 'server-message', message: READY },
    ] as const satisfies readonly ConnectionEvent[];
    expect(at(...ready)[7]).toBe('active');
    expect(at(...ready, { type: 'heartbeat-acked', rttMs: 12 })).toEqual(Array(10).fill('done'));
  });

  it('keeps the progress reached when the connection drops', () => {
    const handshake = { type: 'handshake-received', source: 'live', request: 'a', response: 'b' } as const;
    const failed = { type: 'failed', reason: 'x' } as const;
    expect(at(handshake, failed)[4]).toBe('active');
    expect(at(handshake, { type: 'server-message', message: HELLO }, failed)[5]).toBe('active');
    const afterReady = at(
      handshake,
      { type: 'server-message', message: HELLO },
      { type: 'server-message', message: READY },
      failed,
    );
    expect(afterReady[7]).toBe('active');
    expect(afterReady[6]).toBe('done');
    expect(at(handshake, { type: 'server-message', message: HELLO }, { type: 'server-message', message: READY }, { type: 'heartbeat-acked', rttMs: 1 }, failed)).toEqual(Array(10).fill('done'));
  });
});
