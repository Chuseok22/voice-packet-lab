const HOST_PATTERN = /^[a-z0-9.-]+(:\d{1,5})?$/i;

export function buildContentSecurityPolicy(host: string | undefined): string {
  const connectSources = ["'self'"];
  if (host !== undefined && HOST_PATTERN.test(host)) {
    connectSources.push(`ws://${host}`, `wss://${host}`);
  }
  return [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "media-src 'self' blob:",
    `connect-src ${connectSources.join(' ')}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');
}

export function securityHeaders(host: string | undefined): Record<string, string> {
  return {
    'Content-Security-Policy': buildContentSecurityPolicy(host),
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'microphone=(self), camera=(), geolocation=()',
    'X-Frame-Options': 'DENY',
  };
}
