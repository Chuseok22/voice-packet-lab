import { describe, expect, it } from 'vitest';
import { formatUpgradeRequest, formatUpgradeResponse } from './handshake';

describe('formatUpgradeRequest', () => {
  const rawHeaders = [
    'Host', 'lab.example.com',
    'Connection', 'Upgrade',
    'Upgrade', 'websocket',
    'Sec-WebSocket-Key', 'dGhlIHNhbXBsZSBub25jZQ==',
    'Sec-WebSocket-Version', '13',
    'Origin', 'https://lab.example.com',
    'Cookie', 'session=secret',
    'X-Forwarded-For', '203.0.113.9',
    'Authorization', 'Bearer abc',
    'User-Agent', 'test-agent',
  ];

  it('keeps the request line and only allow-listed headers in their original order and case', () => {
    const text = formatUpgradeRequest('GET', '/ws/voice-gateway?v=8', '1.1', rawHeaders);
    expect(text.split('\n')).toEqual([
      'GET /ws/voice-gateway?v=8 HTTP/1.1',
      'Host: lab.example.com',
      'Connection: Upgrade',
      'Upgrade: websocket',
      'Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==',
      'Sec-WebSocket-Version: 13',
      'Origin: https://lab.example.com',
    ]);
  });

  it('never leaks cookies, credentials or client addresses', () => {
    const text = formatUpgradeRequest('GET', '/', '1.1', rawHeaders);
    expect(text).not.toMatch(/cookie|secret|authorization|bearer|forwarded|203\.0\.113/i);
  });

  it('tolerates a dangling header name', () => {
    expect(formatUpgradeRequest('GET', '/', '1.1', ['Host'])).toBe('GET / HTTP/1.1');
  });
});

describe('formatUpgradeResponse', () => {
  it('keeps the status line and only the handshake headers', () => {
    const text = formatUpgradeResponse([
      'HTTP/1.1 101 Switching Protocols',
      'Upgrade: websocket',
      'Connection: Upgrade',
      'Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=',
      'Set-Cookie: a=b',
      'X-Powered-By: something',
    ]);
    expect(text.split('\n')).toEqual([
      'HTTP/1.1 101 Switching Protocols',
      'Upgrade: websocket',
      'Connection: Upgrade',
      'Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=',
    ]);
  });

  it('returns an empty string for no lines', () => {
    expect(formatUpgradeResponse([])).toBe('');
  });
});
