import { describe, expect, it } from 'vitest';
import { CONNECTION_STEPS } from './connection';

describe('CONNECTION_STEPS', () => {
  it('lists the ten steps in the fixed order', () => {
    expect(CONNECTION_STEPS.map((step) => step.id)).toEqual([
      'tcp',
      'tls',
      'upgrade-request',
      'upgrade-response',
      'hello',
      'identify',
      'ready',
      'heartbeat',
      'select-protocol',
      'udp',
    ]);
  });

  it('gives every step a title, summary, detail and source', () => {
    CONNECTION_STEPS.forEach((step) => {
      expect(step.title.length).toBeGreaterThan(0);
      expect(step.summary.length).toBeGreaterThan(0);
      expect(step.detail.length).toBeGreaterThan(0);
      expect(step.source.length).toBeGreaterThan(0);
    });
  });

  it('marks the browser-invisible and unimplemented steps as explanation only', () => {
    const explain = CONNECTION_STEPS.filter((step) => step.kind === 'explain').map((step) => step.id);
    expect(explain).toEqual(['tcp', 'tls', 'select-protocol', 'udp']);
  });
});
