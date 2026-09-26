import path from 'node:path';

export interface ServerConfig {
  port: number;
  staticDir: string;
  allowedOrigins: readonly string[];
  maxConnections: number;
}

const DEFAULT_PORT = 3000;
const DEFAULT_MAX_CONNECTIONS = 200;

function readInteger(raw: string | undefined, name: string, fallback: number, min: number, max: number): number {
  if (raw === undefined || raw.trim() === '') {
    return fallback;
  }
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${name} 값이 올바르지 않습니다: ${raw} (${min}~${max}의 정수)`);
  }
  return value;
}

export function loadConfig(env: NodeJS.ProcessEnv, cwd: string): ServerConfig {
  return {
    port: readInteger(env.PORT, 'PORT', DEFAULT_PORT, 1, 65535),
    staticDir: env.STATIC_DIR && env.STATIC_DIR.trim() !== '' ? env.STATIC_DIR : path.resolve(cwd, 'client/dist'),
    allowedOrigins: (env.ALLOWED_ORIGINS ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter((origin) => origin !== ''),
    maxConnections: readInteger(env.MAX_CONNECTIONS, 'MAX_CONNECTIONS', DEFAULT_MAX_CONNECTIONS, 1, 100000),
  };
}
