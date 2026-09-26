const REQUEST_HEADER_ALLOWLIST: ReadonlySet<string> = new Set([
  'host',
  'connection',
  'upgrade',
  'sec-websocket-key',
  'sec-websocket-version',
  'sec-websocket-extensions',
  'origin',
]);

const RESPONSE_HEADER_ALLOWLIST: ReadonlySet<string> = new Set([
  'upgrade',
  'connection',
  'sec-websocket-accept',
  'sec-websocket-extensions',
  'sec-websocket-protocol',
]);

export function formatUpgradeRequest(
  method: string,
  target: string,
  httpVersion: string,
  rawHeaders: readonly string[],
): string {
  const lines = [`${method} ${target} HTTP/${httpVersion}`];
  for (let index = 0; index + 1 < rawHeaders.length; index += 2) {
    const name = rawHeaders[index];
    if (REQUEST_HEADER_ALLOWLIST.has(name.toLowerCase())) {
      lines.push(`${name}: ${rawHeaders[index + 1]}`);
    }
  }
  return lines.join('\n');
}

export function formatUpgradeResponse(headerLines: readonly string[]): string {
  if (headerLines.length === 0) {
    return '';
  }
  const [statusLine, ...headers] = headerLines;
  const allowed = headers.filter((line) => RESPONSE_HEADER_ALLOWLIST.has(line.split(':', 1)[0].trim().toLowerCase()));
  return [statusLine, ...allowed].join('\n');
}
