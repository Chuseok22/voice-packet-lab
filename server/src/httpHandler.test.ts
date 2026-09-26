import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createServer, get, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createHttpHandler } from './httpHandler';

let root: string;
let server: Server;
let base: string;
let port: number;

beforeAll(async () => {
  root = mkdtempSync(path.join(tmpdir(), 'vpl-http-'));
  const staticDir = path.join(root, 'dist');
  mkdirSync(path.join(staticDir, 'assets'), { recursive: true });
  mkdirSync(path.join(staticDir, 'audio'), { recursive: true });
  writeFileSync(path.join(staticDir, 'index.html'), '<!doctype html><title>lab</title>');
  writeFileSync(path.join(staticDir, 'assets', 'app-abc.js'), 'console.info(1);');
  writeFileSync(path.join(staticDir, 'audio', 'sample.wav'), 'RIFF');
  writeFileSync(path.join(root, 'secret.txt'), 'top-secret');

  server = createServer(createHttpHandler(staticDir));
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  port = (server.address() as AddressInfo).port;
  base = `http://127.0.0.1:${port}`;
});

afterAll(async () => {
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
  rmSync(root, { recursive: true, force: true });
});

function rawGet(requestPath: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    get({ host: '127.0.0.1', port, path: requestPath }, (response) => {
      let body = '';
      response.on('data', (chunk) => (body += chunk));
      response.on('end', () => resolve({ status: response.statusCode ?? 0, body }));
    }).on('error', reject);
  });
}

describe('http handler', () => {
  it('answers the health check', async () => {
    const response = await fetch(`${base}/healthz`);
    expect(response.status).toBe(200);
    expect(await response.text()).toBe('ok');
  });

  it('serves index.html with no-cache and security headers', async () => {
    const response = await fetch(`${base}/`);
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/html');
    expect(response.headers.get('cache-control')).toBe('no-cache');
    expect(response.headers.get('permissions-policy')).toContain('microphone=(self)');
    expect(response.headers.get('content-security-policy')).toContain(`ws://127.0.0.1:${port}`);
    expect(await response.text()).toContain('<title>lab</title>');
  });

  it('falls back to index.html for client-side routes', async () => {
    const response = await fetch(`${base}/presenter`);
    expect(response.status).toBe(200);
    expect(await response.text()).toContain('<title>lab</title>');
  });

  it('serves hashed assets as immutable', async () => {
    const response = await fetch(`${base}/assets/app-abc.js`);
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/javascript');
    expect(response.headers.get('cache-control')).toBe('public, max-age=31536000, immutable');
  });

  it('serves other files with a short cache and the right type', async () => {
    const response = await fetch(`${base}/audio/sample.wav`);
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('audio/wav');
    expect(response.headers.get('cache-control')).toBe('public, max-age=3600');
  });

  it('returns 404 for a missing file that looks like an asset', async () => {
    expect((await fetch(`${base}/missing.js`)).status).toBe(404);
  });

  it('never serves files outside the static directory', async () => {
    for (const attack of ['/%2e%2e/secret.txt', '/..%2fsecret.txt', '/assets/%2e%2e/%2e%2e/secret.txt']) {
      const { status, body } = await rawGet(attack);
      expect(status).not.toBe(200);
      expect(body).not.toContain('top-secret');
    }
  });

  it('rejects malformed URLs, unsupported methods and answers HEAD without a body', async () => {
    expect((await rawGet('/%E0%A4%A')).status).toBe(400);
    const post = await fetch(`${base}/`, { method: 'POST' });
    expect(post.status).toBe(405);
    expect(post.headers.get('allow')).toBe('GET, HEAD');
    expect(post.headers.get('x-content-type-options')).toBe('nosniff');
    const head = await fetch(`${base}/`, { method: 'HEAD' });
    expect(head.status).toBe(200);
    expect(await head.text()).toBe('');
  });
});
