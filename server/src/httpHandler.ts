import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { logError } from './logger';
import { securityHeaders } from './securityHeaders';

const CONTENT_TYPES: Readonly<Record<string, string>> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.wav': 'audio/wav',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.map': 'application/json; charset=utf-8',
};

const IMMUTABLE_CACHE = 'public, max-age=31536000, immutable';
const SHORT_CACHE = 'public, max-age=3600';

function reply(
  response: ServerResponse,
  status: number,
  text: string,
  host: string | undefined,
  extraHeaders: Record<string, string> = {},
): void {
  response.writeHead(status, {
    ...securityHeaders(host),
    ...extraHeaders,
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Length': Buffer.byteLength(text),
  });
  response.end(text);
}

async function findFile(filePath: string): Promise<boolean> {
  try {
    return (await stat(filePath)).isFile();
  } catch {
    return false;
  }
}

function cacheControlFor(relativePath: string): string {
  if (relativePath === 'index.html') return 'no-cache';
  return relativePath.startsWith('assets/') ? IMMUTABLE_CACHE : SHORT_CACHE;
}

function parsePathname(rawUrl: string | undefined): string | undefined {
  try {
    return decodeURIComponent(new URL(rawUrl ?? '/', 'http://localhost').pathname);
  } catch {
    return undefined;
  }
}

/** 정적 파일 경로를 결정한다. 디렉터리 밖이면 'outside', 파일이 없으면 undefined. */
async function resolveTarget(root: string, pathname: string): Promise<string | 'outside' | undefined> {
  const requested = path.resolve(root, `.${pathname}`);
  if (requested !== root && !requested.startsWith(root + path.sep)) {
    return 'outside';
  }
  if (await findFile(requested)) {
    return requested;
  }
  if (path.extname(pathname) !== '') {
    return undefined;
  }
  const fallback = path.join(root, 'index.html');
  return (await findFile(fallback)) ? fallback : undefined;
}

async function handle(staticDir: string, request: IncomingMessage, response: ServerResponse): Promise<void> {
  const host = request.headers.host;
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    reply(response, 405, 'Method Not Allowed', host, { Allow: 'GET, HEAD' });
    return;
  }

  const pathname = parsePathname(request.url);
  if (pathname === undefined) {
    reply(response, 400, 'Bad Request', host);
    return;
  }
  if (pathname === '/healthz') {
    reply(response, 200, 'ok', host);
    return;
  }

  const root = path.resolve(staticDir);
  const target = await resolveTarget(root, pathname);
  if (target === 'outside') {
    reply(response, 400, 'Bad Request', host);
    return;
  }
  if (target === undefined) {
    reply(response, 404, 'Not Found', host);
    return;
  }

  const relativePath = path.relative(root, target).split(path.sep).join('/');
  response.writeHead(200, {
    ...securityHeaders(host),
    'Content-Type': CONTENT_TYPES[path.extname(target)] ?? 'application/octet-stream',
    'Cache-Control': cacheControlFor(relativePath),
  });
  if (request.method === 'HEAD') {
    response.end();
    return;
  }
  await pipeline(createReadStream(target), response);
}

export function createHttpHandler(staticDir: string): (request: IncomingMessage, response: ServerResponse) => void {
  return (request, response) => {
    handle(staticDir, request, response).catch((error: unknown) => {
      const code = error instanceof Error ? (error as NodeJS.ErrnoException).code : undefined;
      if (code !== 'ERR_STREAM_PREMATURE_CLOSE') {
        logError('http handler failed', { reason: error instanceof Error ? error.message : 'unknown' });
      }
      if (response.headersSent) {
        response.end();
        return;
      }
      reply(response, 500, 'Internal Server Error', request.headers.host);
    });
  };
}
