import { describe, expect, it } from 'vitest';
import { createDefaultConfig } from './config';

describe('createDefaultConfig', () => {
  it('resolves the static directory against the working directory', () => {
    expect(createDefaultConfig('/app')).toEqual({
      port: 3000,
      staticDir: '/app/client/dist',
      allowedOrigins: [],
      maxConnections: 200,
    });
  });
});
