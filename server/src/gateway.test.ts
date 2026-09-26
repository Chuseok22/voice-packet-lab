import { CloseCode, Opcode } from '@voice-packet-lab/shared';
import { describe, expect, it } from 'vitest';
import { HEARTBEAT_INTERVAL_MS, MAX_FIELD_LENGTH, createGatewaySession } from './gateway';

const identify = (overrides: Record<string, unknown> = {}) =>
  JSON.stringify({
    op: Opcode.Identify,
    d: { server_id: '1', user_id: '2', session_id: 'session', token: 'token', ...overrides },
  });
const heartbeat = (d: unknown = { t: 1501184119561, seq_ack: 0 }) => JSON.stringify({ op: Opcode.Heartbeat, d });

describe('gateway session', () => {
  it('starts by sending Hello with the heartbeat interval', () => {
    const session = createGatewaySession();
    expect(session.start()).toEqual([
      { kind: 'send', message: { op: Opcode.Hello, d: { heartbeat_interval: HEARTBEAT_INTERVAL_MS } } },
    ]);
    expect(session.state).toBe('awaiting-identify');
  });

  it('answers Identify with Ready using neutral example values', () => {
    const session = createGatewaySession();
    const [action] = session.receive(identify());
    expect(action).toMatchObject({ kind: 'send', message: { op: Opcode.Ready } });
    if (action.kind !== 'send' || action.message.op !== Opcode.Ready) throw new Error('Ready 응답이 아닙니다');
    expect(action.message.d.ip).toMatch(/^203\.0\.113\./);
    expect(action.message.d.modes).toEqual(['example_mode_a', 'example_mode_b']);
    expect(session.state).toBe('ready');
  });

  it('accepts the optional DAVE version field in Identify', () => {
    const session = createGatewaySession();
    expect(session.receive(identify({ max_dave_protocol_version: 1 }))[0]).toMatchObject({ kind: 'send' });
  });

  it('closes with 4002 for a malformed or oversized Identify', () => {
    for (const bad of [identify({ token: undefined }), identify({ token: '' }), identify({ token: 'x'.repeat(MAX_FIELD_LENGTH + 1) }), identify({ max_dave_protocol_version: 'one' })]) {
      const session = createGatewaySession();
      expect(session.receive(bad)).toEqual([{ kind: 'close', code: CloseCode.DecodeFailed, reason: 'Failed to decode payload' }]);
      expect(session.state).toBe('closed');
    }
  });

  it('closes with 4005 on a second Identify', () => {
    const session = createGatewaySession();
    session.receive(identify());
    expect(session.receive(identify())).toEqual([
      { kind: 'close', code: CloseCode.AlreadyAuthenticated, reason: 'Already authenticated' },
    ]);
  });

  it('echoes the heartbeat timestamp in the ACK, before and after Identify', () => {
    const session = createGatewaySession();
    expect(session.receive(heartbeat({ t: 42, seq_ack: 0 }))).toEqual([
      { kind: 'send', message: { op: Opcode.HeartbeatAck, d: { t: 42 } } },
    ]);
    session.receive(identify());
    expect(session.receive(heartbeat({ t: 43, seq_ack: 0 }))).toEqual([
      { kind: 'send', message: { op: Opcode.HeartbeatAck, d: { t: 43 } } },
    ]);
  });

  it('closes with 4002 for a malformed heartbeat', () => {
    for (const d of [5, null, { t: 'x', seq_ack: 0 }, { t: 1 }, { t: Number.NaN, seq_ack: 0 }]) {
      const session = createGatewaySession();
      expect(session.receive(heartbeat(d))[0]).toMatchObject({ kind: 'close', code: CloseCode.DecodeFailed });
    }
  });

  it('closes with 4002 for undecodable frames', () => {
    for (const raw of ['not json', '"text"', '[]', 'null', '{}', '{"op":"0"}', '{"op":1.5}']) {
      const session = createGatewaySession();
      expect(session.receive(raw)[0]).toMatchObject({ kind: 'close', code: CloseCode.DecodeFailed });
    }
  });

  it('closes with 4003 for other opcodes before Identify and 4001 after', () => {
    const early = createGatewaySession();
    expect(early.receive(JSON.stringify({ op: Opcode.SelectProtocol, d: {} }))[0]).toMatchObject({
      kind: 'close',
      code: CloseCode.NotAuthenticated,
    });

    const late = createGatewaySession();
    late.receive(identify());
    expect(late.receive(JSON.stringify({ op: 99, d: {} }))[0]).toMatchObject({
      kind: 'close',
      code: CloseCode.UnknownOpcode,
    });
  });

  it('times out only while waiting for Identify', () => {
    const waiting = createGatewaySession();
    expect(waiting.identifyTimeout()).toEqual([{ kind: 'close', code: CloseCode.SessionTimeout, reason: 'Session timeout' }]);

    const done = createGatewaySession();
    done.receive(identify());
    expect(done.identifyTimeout()).toEqual([]);
  });

  it('ignores everything after closing', () => {
    const session = createGatewaySession();
    session.receive('not json');
    expect(session.receive(heartbeat())).toEqual([]);
    expect(session.identifyTimeout()).toEqual([]);
  });
});
