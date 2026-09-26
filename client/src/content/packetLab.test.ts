import { describe, expect, it } from 'vitest';
import { SCENARIOS } from '../engine/settings';
import { packetLabContent } from './packetLab';

describe('packetLabContent', () => {
  it('has a label for every scenario', () => {
    SCENARIOS.forEach(({ id }) => {
      expect(packetLabContent.scenarios[id].length).toBeGreaterThan(0);
    });
  });

  it('describes every slider with a meaning and an effect', () => {
    Object.values(packetLabContent.sliders).forEach((slider) => {
      expect(slider.label.length).toBeGreaterThan(0);
      expect(slider.description.length).toBeGreaterThan(0);
      expect(slider.effect.length).toBeGreaterThan(0);
    });
  });

  it('keeps the required simulation notice', () => {
    expect(packetLabContent.notice).toContain('시뮬레이션');
    expect(packetLabContent.notice).toContain('Opus');
  });

  it('explains every packet state in Korean', () => {
    expect(packetLabContent.explain.lost(104)).toContain('#104');
    expect(packetLabContent.explain.late(104, 260, 40)).toContain('폐기');
  });
});
