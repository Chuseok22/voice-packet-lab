import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS } from '../../engine/settings';
import { ConditionSliders } from './ConditionSliders';
import { PlayBar } from './PlayBar';
import { ScenarioChips } from './ScenarioChips';
import { SlidersPanel } from './SlidersPanel';

describe('ScenarioChips', () => {
  it('marks the active scenario and reports clicks', async () => {
    const onChoose = vi.fn();
    render(<ScenarioChips activeId="loss" onChoose={onChoose} />);
    expect(screen.getByRole('button', { name: '패킷 손실' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '정상' })).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(screen.getByRole('button', { name: '심한 지터' }));
    expect(onChoose).toHaveBeenCalledWith('jitter');
  });

  it('marks nothing when the settings are custom', () => {
    render(<ScenarioChips activeId={null} onChoose={() => undefined} />);
    screen.getAllByRole('button').forEach((button) => expect(button).toHaveAttribute('aria-pressed', 'false'));
  });
});

describe('ConditionSliders', () => {
  it('shows each slider with its explanation and current value', () => {
    render(<ConditionSliders settings={DEFAULT_SETTINGS} onChange={() => undefined} />);
    expect(screen.getByLabelText('Packet Loss')).toHaveValue('15');
    expect(screen.getByText(/도착하지 못하는 패킷 비율/)).toBeInTheDocument();
    expect(screen.getByLabelText('Jitter Buffer')).toHaveAttribute('aria-valuetext', 'OFF');
  });

  it('reports a numeric change for the changed setting', () => {
    const onChange = vi.fn();
    render(<ConditionSliders settings={DEFAULT_SETTINGS} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Jitter'), { target: { value: '120' } });
    expect(onChange).toHaveBeenCalledWith({ jitterMs: 120 });
  });
});

describe('PlayBar', () => {
  it('toggles labels while playing and reports clicks', async () => {
    const onToggle = vi.fn();
    const { rerender } = render(
      <PlayBar playing={null} settingsSummary="요약" sourceLabel="기본 음원" error={null} onToggle={onToggle} />,
    );
    await userEvent.click(screen.getByRole('button', { name: /현재 설정으로 듣기/ }));
    expect(onToggle).toHaveBeenCalledWith('degraded');
    await userEvent.click(screen.getByRole('button', { name: /정상 음성 듣기/ }));
    expect(onToggle).toHaveBeenCalledWith('original');

    rerender(
      <PlayBar playing="degraded" settingsSummary="요약" sourceLabel="기본 음원" error={null} onToggle={onToggle} />,
    );
    expect(screen.getByRole('button', { name: /정지/ })).toHaveAttribute('aria-pressed', 'true');
  });

  it('announces playback errors', () => {
    render(
      <PlayBar playing={null} settingsSummary="요약" sourceLabel="기본 음원" error="재생 실패" onToggle={() => undefined} />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('재생 실패');
  });
});

describe('SlidersPanel', () => {
  it('starts collapsed and reveals the sliders once expanded', () => {
    render(<SlidersPanel settings={DEFAULT_SETTINGS} onChange={() => undefined} />);
    expect(screen.getByLabelText('Packet Loss')).not.toBeVisible();
    fireEvent.click(screen.getByText('슬라이더로 직접 조절하기'));
    expect(screen.getByLabelText('Packet Loss')).toBeVisible();
  });
});
