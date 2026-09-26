import { Opcode, type ServerFrame } from '@voice-packet-lab/shared';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function parseServerFrame(raw: string): ServerFrame | null {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(value)) return null;

  if (value.type === 'handshake') {
    return typeof value.request === 'string' && typeof value.response === 'string'
      ? { type: 'handshake', request: value.request, response: value.response }
      : null;
  }

  const { op, d } = value;
  if (!isRecord(d)) return null;

  switch (op) {
    case Opcode.Hello:
      return isFiniteNumber(d.heartbeat_interval)
        ? { op: Opcode.Hello, d: { heartbeat_interval: d.heartbeat_interval } }
        : null;
    case Opcode.Ready:
      return isFiniteNumber(d.ssrc) &&
        typeof d.ip === 'string' &&
        isFiniteNumber(d.port) &&
        Array.isArray(d.modes) &&
        d.modes.every((mode): mode is string => typeof mode === 'string')
        ? { op: Opcode.Ready, d: { ssrc: d.ssrc, ip: d.ip, port: d.port, modes: d.modes } }
        : null;
    case Opcode.HeartbeatAck:
      return isFiniteNumber(d.t) ? { op: Opcode.HeartbeatAck, d: { t: d.t } } : null;
    default:
      return null;
  }
}
