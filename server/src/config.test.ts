import { describe, expect, it } from 'vitest';
import { loadConfig } from './config';

describe('loadConfig', () => {
  it('uses defaults', () => {
    expect(loadConfig({}, '/app')).toEqual({
      port: 3000,
      staticDir: '/app/client/dist',
      allowedOrigins: [],
      maxConnections: 200,
    });
  });

  it('reads overrides and trims the origin list', () => {
    const config = loadConfig(
      { PORT: '8080', STATIC_DIR: '/srv/www', ALLOWED_ORIGINS: ' https://a.example , https://b.example ,', MAX_CONNECTIONS: '50' },
      '/app',
    );
    expect(config).toEqual({
      port: 8080,
      staticDir: '/srv/www',
      allowedOrigins: ['https://a.example', 'https://b.example'],
      maxConnections: 50,
    });
  });

  it('rejects invalid ports and connection limits', () => {
    expect(() => loadConfig({ PORT: 'abc' }, '/app')).toThrow('PORT');
    expect(() => loadConfig({ PORT: '0' }, '/app')).toThrow('PORT');
    expect(() => loadConfig({ PORT: '70000' }, '/app')).toThrow('PORT');
    expect(() => loadConfig({ MAX_CONNECTIONS: '-1' }, '/app')).toThrow('MAX_CONNECTIONS');
    expect(() => loadConfig({ MAX_CONNECTIONS: '1.5' }, '/app')).toThrow('MAX_CONNECTIONS');
  });
});
