import { HEADER_HINTS, OTHER_STATUS_LINE_HINT, REQUEST_LINE_HINT, STATUS_LINE_HINT } from '../../content/connection';

const HIGHLIGHTED = /^(upgrade:|sec-websocket-key:|sec-websocket-accept:|http\/1\.1 101\b)/i;

export function isHighlightedLine(line: string): boolean {
  return HIGHLIGHTED.test(line.trim());
}

export function hintForLine(line: string): string | null {
  const text = line.trim();
  if (text === '') return null;
  if (/^HTTP\/\d/i.test(text)) {
    return /^HTTP\/\d(\.\d)? 101\b/i.test(text) ? STATUS_LINE_HINT : OTHER_STATUS_LINE_HINT;
  }
  if (/^[A-Z]+ \S+ HTTP\/\d/.test(text)) return REQUEST_LINE_HINT;
  const name = text.split(':', 1)[0].trim().toLowerCase();
  return HEADER_HINTS[name] ?? null;
}
