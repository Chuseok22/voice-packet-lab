import type { CSSProperties } from 'react';
import { packetLabContent } from '../../content/packetLab';
import { SETTING_LIMITS } from '../../engine/settings';
import type { NetworkSettings } from '../../engine/types';

type SliderKey = 'lossPercent' | 'delayMs' | 'jitterMs' | 'bufferMs';

interface SliderSpec {
  key: SliderKey;
  min: number;
  max: number;
  step: number;
  format: (value: number) => string;
}

const SLIDERS: readonly SliderSpec[] = [
  { key: 'lossPercent', min: SETTING_LIMITS.lossPercent.min, max: SETTING_LIMITS.lossPercent.max, step: 1, format: (value) => `${value} %` },
  { key: 'delayMs', min: SETTING_LIMITS.delayMs.min, max: SETTING_LIMITS.delayMs.max, step: 10, format: (value) => `${value} ms` },
  { key: 'jitterMs', min: SETTING_LIMITS.jitterMs.min, max: SETTING_LIMITS.jitterMs.max, step: 10, format: (value) => `${value} ms` },
  {
    key: 'bufferMs',
    min: 0,
    max: SETTING_LIMITS.bufferMs.max,
    step: 20,
    format: (value) => (value === 0 ? packetLabContent.bufferOff : `${value} ms`),
  },
];

interface ConditionSlidersProps {
  settings: NetworkSettings;
  onChange: (patch: Partial<NetworkSettings>) => void;
}

export function ConditionSliders({ settings, onChange }: ConditionSlidersProps) {
  return (
    <div className="sliders">
      {SLIDERS.map((spec) => {
        const copy = packetLabContent.sliders[spec.key];
        const value = settings[spec.key];
        const inputId = `slider-${spec.key}`;
        const fill = `${((value - spec.min) / (spec.max - spec.min)) * 100}%`;
        return (
          <div key={spec.key} className="slider-row">
            <div className="slider-top">
              <label htmlFor={inputId}>{copy.label}</label>
              <output htmlFor={inputId}>{spec.format(value)}</output>
            </div>
            <input
              id={inputId}
              type="range"
              min={spec.min}
              max={spec.max}
              step={spec.step}
              value={value}
              aria-valuetext={spec.format(value)}
              style={{ '--fill': fill } as CSSProperties}
              onChange={(event) => onChange({ [spec.key]: Number(event.target.value) })}
            />
            <p className="slider-help">
              {copy.description} → <strong>{copy.effect}</strong>
            </p>
          </div>
        );
      })}
    </div>
  );
}
