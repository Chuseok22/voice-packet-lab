import { describe, expect, it } from 'vitest';
import { parseServerFrame } from './parseServerFrame';

describe('parseServerFrame', () => {
  it('parses the handshake meta frame', () => {
    expect(parseServerFrame(JSON.stringify({ type: 'handshake', request: 'GET / HTTP/1.1', response: 'HTTP/1.1 101 Switching Protocols' }))).toEqual({
      type: 'handshake',
      request: 'GET / HTTP/1.1',
      response: 'HTTP/1.1 101 Switching Protocols',
    });
  });

  it('parses Hello, Ready and Heartbeat ACK', () => {
    expect(parseServerFrame('{"op":8,"d":{"heartbeat_interval":5000}}')).toEqual({ op: 8, d: { heartbeat_interval: 5000 } });
    expect(parseServerFrame('{"op":2,"d":{"ssrc":1,"ip":"203.0.113.10","port":50000,"modes":["a","b"]}}')).toEqual({
      op: 2,
      d: { ssrc: 1, ip: '203.0.113.10', port: 50000, modes: ['a', 'b'] },
    });
    expect(parseServerFrame('{"op":6,"d":{"t":42}}')).toEqual({ op: 6, d: { t: 42 } });
  });

  it('rejects malformed, unknown and mistyped frames', () => {
    for (const raw of [
      'not json',
      'null',
      '[]',
      '{}',
      '{"type":"handshake","request":1,"response":"x"}',
      '{"op":8}',
      '{"op":8,"d":{"heartbeat_interval":"5000"}}',
      '{"op":2,"d":{"ssrc":1,"ip":"x","port":1,"modes":[1]}}',
      '{"op":6,"d":{}}',
      '{"op":99,"d":{}}',
    ]) {
      expect(parseServerFrame(raw)).toBeNull();
    }
  });
});
