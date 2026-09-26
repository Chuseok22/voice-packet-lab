import { describe, expect, it } from 'vitest';
import { buildContentSecurityPolicy, securityHeaders } from './securityHeaders';

describe('buildContentSecurityPolicy', () => {
  it('locks everything to the same origin and allows blob audio', () => {
    const policy = buildContentSecurityPolicy(undefined);
    expect(policy).toContain("default-src 'self'");
    expect(policy).toContain("script-src 'self'");
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain('media-src \'self\' blob:');
    expect(policy).toContain("connect-src 'self'");
  });

  it('adds explicit ws/wss for a well-formed host (Safari does not treat self as ws)', () => {
    const policy = buildContentSecurityPolicy('lab.example.com:8443');
    expect(policy).toContain('ws://lab.example.com:8443');
    expect(policy).toContain('wss://lab.example.com:8443');
  });

  it('ignores a malformed or injected host header', () => {
    const policy = buildContentSecurityPolicy("evil.com; script-src *");
    expect(policy).not.toContain('evil.com');
    expect(policy).toContain("connect-src 'self'");
  });
});

describe('securityHeaders', () => {
  it('sets the fixed hardening headers and allows only same-origin microphone', () => {
    const headers = securityHeaders('localhost:3000');
    expect(headers['X-Content-Type-Options']).toBe('nosniff');
    expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['Permissions-Policy']).toBe('microphone=(self), camera=(), geolocation=()');
    expect(headers['X-Frame-Options']).toBe('DENY');
    expect(headers['Content-Security-Policy']).toContain("default-src 'self'");
  });
});
