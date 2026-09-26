import { describe, expect, it } from 'vitest';
import { CloseCode, GATEWAY_PATH, GATEWAY_VERSION, Opcode, opcodeName } from './gateway';

describe('gateway constants', () => {
  it('uses the documented path, version, opcodes and close codes', () => {
    expect(GATEWAY_PATH).toBe('/ws/voice-gateway');
    expect(GATEWAY_VERSION).toBe(8);
    expect(Opcode).toEqual({
      Identify: 0,
      SelectProtocol: 1,
      Ready: 2,
      Heartbeat: 3,
      SessionDescription: 4,
      HeartbeatAck: 6,
      Hello: 8,
    });
    expect(CloseCode).toEqual({
      UnknownOpcode: 4001,
      DecodeFailed: 4002,
      NotAuthenticated: 4003,
      AlreadyAuthenticated: 4005,
      SessionTimeout: 4009,
    });
  });
});

describe('opcodeName', () => {
  it('names known opcodes', () => {
    expect(opcodeName(0)).toBe('Identify');
    expect(opcodeName(1)).toBe('Select Protocol');
    expect(opcodeName(2)).toBe('Ready');
    expect(opcodeName(3)).toBe('Heartbeat');
    expect(opcodeName(4)).toBe('Session Description');
    expect(opcodeName(6)).toBe('Heartbeat ACK');
    expect(opcodeName(8)).toBe('Hello');
  });

  it('falls back to the number for unknown opcodes', () => {
    expect(opcodeName(99)).toBe('op 99');
  });
});
