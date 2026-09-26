import { packetLabContent } from '../../content/packetLab';

interface WaveBarsProps {
  bars: number[];
  showGaps: boolean;
}

function WaveBars({ bars, showGaps }: WaveBarsProps) {
  return (
    <div className="wave-bars" aria-hidden="true">
      {bars.map((bar, index) =>
        showGaps && bar === 0 ? (
          <i key={index} className="gap" />
        ) : (
          <i key={index} style={{ height: `${Math.max(4, Math.round(bar * 100))}%` }} />
        ),
      )}
    </div>
  );
}

interface WaveCompareProps {
  original: number[];
  degraded: number[];
}

export function WaveCompare({ original, degraded }: WaveCompareProps) {
  const { wave } = packetLabContent;
  return (
    <details className="wave" open>
      <summary>{wave.summary}</summary>
      <p className="wave-label">{wave.original}</p>
      <WaveBars bars={original} showGaps={false} />
      <p className="wave-label">{wave.degraded}</p>
      <WaveBars bars={degraded} showGaps />
    </details>
  );
}
