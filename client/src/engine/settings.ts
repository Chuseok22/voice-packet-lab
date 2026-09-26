import type { NetworkSettings } from './types';

export type ScenarioId = 'normal' | 'loss' | 'jitter' | 'jitter-buffer';

export interface Scenario {
  id: ScenarioId;
  settings: Omit<NetworkSettings, 'seed'>;
}

export const BUFFER_OFF = 0;
export const DEFAULT_SEED = 1;
const MAX_SEED = 2147483647;

export const SETTING_LIMITS = {
  lossPercent: { min: 0, max: 30 },
  delayMs: { min: 0, max: 500 },
  jitterMs: { min: 0, max: 300 },
  bufferMs: { min: 20, max: 300 },
} as const;

export const SCENARIOS: readonly Scenario[] = [
  { id: 'normal', settings: { lossPercent: 0, delayMs: 20, jitterMs: 0, bufferMs: BUFFER_OFF } },
  { id: 'loss', settings: { lossPercent: 15, delayMs: 100, jitterMs: 0, bufferMs: BUFFER_OFF } },
  { id: 'jitter', settings: { lossPercent: 0, delayMs: 100, jitterMs: 150, bufferMs: BUFFER_OFF } },
  { id: 'jitter-buffer', settings: { lossPercent: 0, delayMs: 100, jitterMs: 150, bufferMs: 160 } },
];

export const DEFAULT_SETTINGS: NetworkSettings = {
  lossPercent: 15,
  delayMs: 100,
  jitterMs: 0,
  bufferMs: BUFFER_OFF,
  seed: DEFAULT_SEED,
};

interface Range {
  min: number;
  max: number;
}

function readNumber(params: URLSearchParams, key: string): number | null {
  const raw = params.get(key);
  if (raw === null || raw.trim() === '') {
    return null;
  }
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function clampRounded(value: number, { min, max }: Range): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}

function readBounded(params: URLSearchParams, key: string, range: Range, fallback: number): number {
  const value = readNumber(params, key);
  return value === null ? fallback : clampRounded(value, range);
}

function readBuffer(params: URLSearchParams, fallback: number): number {
  const value = readNumber(params, 'buffer');
  if (value === null) {
    return fallback;
  }
  return value <= 0 ? BUFFER_OFF : clampRounded(value, SETTING_LIMITS.bufferMs);
}

function readSeed(params: URLSearchParams): number {
  const value = readNumber(params, 'seed');
  return value !== null && Number.isInteger(value) && value >= 0 && value <= MAX_SEED
    ? value
    : DEFAULT_SEED;
}

export function parseSettings(search: string): NetworkSettings {
  const params = new URLSearchParams(search);
  return {
    lossPercent: readBounded(params, 'loss', SETTING_LIMITS.lossPercent, DEFAULT_SETTINGS.lossPercent),
    delayMs: readBounded(params, 'delay', SETTING_LIMITS.delayMs, DEFAULT_SETTINGS.delayMs),
    jitterMs: readBounded(params, 'jitter', SETTING_LIMITS.jitterMs, DEFAULT_SETTINGS.jitterMs),
    bufferMs: readBuffer(params, DEFAULT_SETTINGS.bufferMs),
    seed: readSeed(params),
  };
}

export function serializeSettings(settings: NetworkSettings): string {
  const params = new URLSearchParams({
    loss: String(settings.lossPercent),
    delay: String(settings.delayMs),
    jitter: String(settings.jitterMs),
    buffer: String(settings.bufferMs),
    seed: String(settings.seed),
  });
  return `?${params.toString()}`;
}

export function matchScenarioId(settings: NetworkSettings): ScenarioId | null {
  const match = SCENARIOS.find(
    ({ settings: preset }) =>
      preset.lossPercent === settings.lossPercent &&
      preset.delayMs === settings.delayMs &&
      preset.jitterMs === settings.jitterMs &&
      preset.bufferMs === settings.bufferMs,
  );
  return match ? match.id : null;
}

export function applyScenario(id: ScenarioId, seed: number): NetworkSettings {
  const scenario = SCENARIOS.find((candidate) => candidate.id === id);
  if (!scenario) {
    throw new Error(`알 수 없는 시나리오: ${id}`);
  }
  return { ...scenario.settings, seed };
}
