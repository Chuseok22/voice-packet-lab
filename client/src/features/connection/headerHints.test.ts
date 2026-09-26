import { describe, expect, it } from 'vitest';
import { hintForLine, isHighlightedLine } from './headerHints';

describe('hintForLine', () => {
  it('explains the request line and the 101 status line', () => {
    expect(hintForLine('GET /ws/voice-gateway?v=8 HTTP/1.1')).toContain('첫 줄');
    expect(hintForLine('HTTP/1.1 101 Switching Protocols')).toContain('프로토콜을 바꿨다');
  });

  it('explains headers regardless of case', () => {
    expect(hintForLine('Upgrade: websocket')).toContain('websocket');
    expect(hintForLine('sec-websocket-key: abc')).toContain('임의');
    expect(hintForLine('Sec-WebSocket-Accept: xyz')).toContain('계산');
  });

  it('returns null for unknown headers and blank lines', () => {
    expect(hintForLine('X-Unknown: 1')).toBeNull();
    expect(hintForLine('')).toBeNull();
  });
});

describe('isHighlightedLine', () => {
  it('highlights the upgrade-defining lines only', () => {
    expect(isHighlightedLine('Upgrade: websocket')).toBe(true);
    expect(isHighlightedLine('Sec-WebSocket-Key: abc')).toBe(true);
    expect(isHighlightedLine('Sec-WebSocket-Accept: abc')).toBe(true);
    expect(isHighlightedLine('HTTP/1.1 101 Switching Protocols')).toBe(true);
    expect(isHighlightedLine('Host: lab.example.com')).toBe(false);
    expect(isHighlightedLine('GET / HTTP/1.1')).toBe(false);
  });
});
