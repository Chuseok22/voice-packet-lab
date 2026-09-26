import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SETTINGS,
  SCENARIOS,
  applyScenario,
  matchScenarioId,
  parseSettings,
  serializeSettings,
} from './settings';

describe('parseSettings', () => {
  it('returns defaults for an empty query', () => {
    expect(parseSettings('')).toEqual(DEFAULT_SETTINGS);
  });

  it('reads valid values', () => {
    expect(parseSettings('?loss=10&delay=200&jitter=90&buffer=140&seed=42')).toEqual({
      lossPercent: 10,
      delayMs: 200,
      jitterMs: 90,
      bufferMs: 140,
      seed: 42,
    });
  });

  it('clamps out-of-range values', () => {
    const settings = parseSettings('?loss=99&delay=99999&jitter=-5&buffer=500');
    expect(settings.lossPercent).toBe(30);
    expect(settings.delayMs).toBe(500);
    expect(settings.jitterMs).toBe(0);
    expect(settings.bufferMs).toBe(300);
  });

  it('treats buffer <= 0 as OFF and small positive buffers as the minimum', () => {
    expect(parseSettings('?buffer=0').bufferMs).toBe(0);
    expect(parseSettings('?buffer=-5').bufferMs).toBe(0);
    expect(parseSettings('?buffer=5').bufferMs).toBe(20);
  });

  it('falls back to defaults for garbage values', () => {
    const settings = parseSettings('?loss=abc&delay=&jitter=%3Cscript%3E&buffer=NaN&seed=1.5');
    expect(settings).toEqual(DEFAULT_SETTINGS);
  });

  it('rejects unusable seeds but accepts large valid ones', () => {
    expect(parseSettings('?seed=-3').seed).toBe(1);
    expect(parseSettings('?seed=1e10').seed).toBe(1);
    expect(parseSettings('?seed=1e9').seed).toBe(1000000000);
  });

  it('uses the first value of a repeated key', () => {
    expect(parseSettings('?loss=5&loss=20').lossPercent).toBe(5);
  });

  it('rounds fractional values', () => {
    expect(parseSettings('?loss=12.6').lossPercent).toBe(13);
  });
});

describe('serializeSettings', () => {
  it('round-trips through parseSettings', () => {
    const settings = { lossPercent: 12, delayMs: 340, jitterMs: 70, bufferMs: 60, seed: 9 };
    expect(serializeSettings(settings)).toBe('?loss=12&delay=340&jitter=70&buffer=60&seed=9');
    expect(parseSettings(serializeSettings(settings))).toEqual(settings);
  });
});

describe('scenarios', () => {
  it('lists the four presets in teaching order', () => {
    expect(SCENARIOS.map((scenario) => scenario.id)).toEqual(['normal', 'loss', 'jitter', 'jitter-buffer']);
  });

  it('applies a preset while keeping the seed', () => {
    expect(applyScenario('jitter-buffer', 7)).toEqual({
      lossPercent: 0,
      delayMs: 100,
      jitterMs: 150,
      bufferMs: 160,
      seed: 7,
    });
  });

  it('matches settings to a preset regardless of the seed', () => {
    expect(matchScenarioId({ ...applyScenario('jitter', 5) })).toBe('jitter');
    expect(matchScenarioId({ ...applyScenario('normal', 99) })).toBe('normal');
  });

  it('returns null for custom settings', () => {
    expect(matchScenarioId({ ...DEFAULT_SETTINGS, lossPercent: 7 })).toBeNull();
  });

  it('uses the loss preset as the default', () => {
    expect(matchScenarioId(DEFAULT_SETTINGS)).toBe('loss');
  });
});
