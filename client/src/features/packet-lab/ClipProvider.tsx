import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { loadBundledSample } from '../../audio/clip';
import { packetLabContent } from '../../content/packetLab';
import { SAMPLES_PER_FRAME } from '../../engine/constants';
import { splitIntoFrames } from '../../engine/packets';

interface CustomClip {
  frames: Float32Array[];
  label: string;
}

interface ClipContextValue {
  frames: Float32Array[] | null;
  sourceLabel: string;
  loadError: string | null;
  replaceClip: (samples: Float32Array, label: string) => string | null;
  resetClip: () => void;
}

const ClipContext = createContext<ClipContextValue | null>(null);

export function ClipProvider({ children }: { children: ReactNode }) {
  const [bundledFrames, setBundledFrames] = useState<Float32Array[] | null>(null);
  const [customClip, setCustomClip] = useState<CustomClip | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadBundledSample()
      .then((samples) => {
        if (!cancelled) setBundledFrames(splitIntoFrames(samples));
      })
      .catch(() => {
        if (!cancelled) setLoadError(packetLabContent.errors.sampleLoad);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const replaceClip = useCallback((samples: Float32Array, label: string): string | null => {
    if (samples.length < SAMPLES_PER_FRAME) {
      return packetLabContent.errors.clipTooShort;
    }
    setCustomClip({ frames: splitIntoFrames(samples), label });
    return null;
  }, []);

  const resetClip = useCallback(() => setCustomClip(null), []);

  const value = useMemo<ClipContextValue>(
    () => ({
      frames: customClip?.frames ?? bundledFrames,
      sourceLabel: customClip?.label ?? packetLabContent.sourceLabels.bundled,
      loadError,
      replaceClip,
      resetClip,
    }),
    [customClip, bundledFrames, loadError, replaceClip, resetClip],
  );

  return <ClipContext.Provider value={value}>{children}</ClipContext.Provider>;
}

export function useClip(): ClipContextValue {
  const value = useContext(ClipContext);
  if (!value) {
    throw new Error('useClip은 ClipProvider 안에서만 사용할 수 있습니다.');
  }
  return value;
}
