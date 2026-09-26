import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MetricsPanel } from './MetricsPanel';

describe('MetricsPanel', () => {
  it('shows the four metrics', () => {
    render(
      <MetricsPanel
        metrics={{ lossRatio: 0.147, averageLatencyMs: 102.6, lateDropped: 18, reordered: 6 }}
        bufferEnabled
      />,
    );
    expect(screen.getByText('14.7%')).toBeInTheDocument();
    expect(screen.getByText('103 ms')).toBeInTheDocument();
    expect(screen.getByText('18')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
  });

  it('shows a dash instead of late drops when the buffer is off', () => {
    render(
      <MetricsPanel
        metrics={{ lossRatio: 0, averageLatencyMs: 100, lateDropped: null, reordered: 0 }}
        bufferEnabled={false}
      />,
    );
    const late = screen.getByText('지각 폐기').closest('div');
    expect(late).toHaveTextContent('—');
  });

  it('shows a dash when nothing was played', () => {
    render(
      <MetricsPanel
        metrics={{ lossRatio: 1, averageLatencyMs: null, lateDropped: null, reordered: 0 }}
        bufferEnabled={false}
      />,
    );
    const latency = screen.getByText('평균 지연').closest('div');
    expect(latency).toHaveTextContent('—');
  });
});
