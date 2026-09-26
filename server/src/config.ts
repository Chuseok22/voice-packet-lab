import path from 'node:path';

export interface ServerConfig {
  port: number;
  staticDir: string;
  allowedOrigins: readonly string[];
  maxConnections: number;
}

export function createDefaultConfig(cwd: string): ServerConfig {
  return {
    port: 3000,
    staticDir: path.resolve(cwd, 'client/dist'),
    allowedOrigins: [],
    maxConnections: 200,
  };
}
