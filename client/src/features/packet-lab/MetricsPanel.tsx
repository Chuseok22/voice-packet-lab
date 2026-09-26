import { packetLabContent } from '../../content/packetLab';
import type { Metrics } from '../../engine/types';
import { formatMs, formatPercent } from './format';

interface MetricsPanelProps {
  metrics: Metrics;
  bufferEnabled: boolean;
}

interface Tile {
  label: string;
  value: string;
  warn: boolean;
}

export function MetricsPanel({ metrics, bufferEnabled }: MetricsPanelProps) {
  const { metrics: labels } = packetLabContent;
  const tiles: Tile[] = [
    { label: labels.loss, value: formatPercent(metrics.lossRatio), warn: false },
    {
      label: labels.latency,
      value: metrics.averageLatencyMs === null ? labels.notApplicable : formatMs(metrics.averageLatencyMs),
      warn: false,
    },
    {
      label: labels.late,
      value: bufferEnabled && metrics.lateDropped !== null ? String(metrics.lateDropped) : labels.notApplicable,
      warn: (metrics.lateDropped ?? 0) > 0,
    },
    { label: labels.reordered, value: String(metrics.reordered), warn: metrics.reordered > 0 },
  ];

  return (
    <dl className="metrics">
      {tiles.map((tile) => (
        <div key={tile.label} className={tile.warn ? 'metric metric-warn' : 'metric'}>
          <dt>{tile.label}</dt>
          <dd>{tile.value}</dd>
        </div>
      ))}
    </dl>
  );
}
