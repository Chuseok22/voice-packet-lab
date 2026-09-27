import { useEffect, useState } from 'react';
import { packetLabContent } from '../../content/packetLab';
import { ConditionSliders } from './ConditionSliders';
import type { NetworkSettings } from '../../engine/types';

const WIDE_QUERY = '(min-width: 900px)';

function useIsWideScreen(): boolean {
  const [isWide, setIsWide] = useState(
    () => typeof window.matchMedia === 'function' && window.matchMedia(WIDE_QUERY).matches,
  );

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') {
      return;
    }
    const query = window.matchMedia(WIDE_QUERY);
    const onChange = () => setIsWide(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  return isWide;
}

interface SlidersPanelProps {
  settings: NetworkSettings;
  onChange: (patch: Partial<NetworkSettings>) => void;
}

export function SlidersPanel({ settings, onChange }: SlidersPanelProps) {
  const { cards, controlsToggle } = packetLabContent;
  const isWide = useIsWideScreen();
  return (
    <details className="card sliders-details" open={isWide || undefined}>
      <summary className="sliders-summary">
        <span className="step-badge" aria-hidden="true">4</span>
        {controlsToggle.show}
      </summary>
      <div className="sliders-body">
        <h2 className="sliders-title">{cards.conditions}</h2>
        <ConditionSliders settings={settings} onChange={onChange} />
      </div>
    </details>
  );
}
