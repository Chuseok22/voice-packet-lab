import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { NetworkSettings, SimulatedPacket } from '../../engine/types';
import { PacketLanes } from './PacketLanes';
import { PacketOverview } from './PacketOverview';
import { RtpDetail } from './RtpDetail';
import { WaveCompare } from './WaveCompare';

const settings: NetworkSettings = { lossPercent: 15, delayMs: 100, jitterMs: 0, bufferMs: 0, seed: 1 };

function packet(index: number, overrides: Partial<SimulatedPacket> = {}): SimulatedPacket {
  return {
    sequenceNumber: 101 + index,
    timestamp: index * 960,
    ssrc: 3192048,
    sentAtMs: index * 20,
    status: 'on-time',
    arrivalAtMs: index * 20 + 100,
    playoutAtMs: index * 20 + 100,
    reordered: false,
    ...overrides,
  };
}

const packets = [
  packet(0),
  packet(1, { status: 'lost', arrivalAtMs: null, playoutAtMs: null }),
  packet(2, { status: 'late', playoutAtMs: null, arrivalAtMs: 300 }),
];

describe('PacketLanes', () => {
  it('renders one focusable receiver button per packet with a Korean label', () => {
    render(
      <PacketLanes packets={packets} nominalDelayMs={100} selectedSequence={null} onSelect={() => undefined} playheadMs={null} />,
    );
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(3);
    expect(screen.getByRole('button', { name: '패킷 102번, 손실' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '패킷 103번, 지각' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /패킷 흐름/ })).toBeInTheDocument();
  });

  it('reports clicks and keyboard activation with the sequence number', async () => {
    const onSelect = vi.fn();
    render(
      <PacketLanes packets={packets} nominalDelayMs={100} selectedSequence={102} onSelect={onSelect} playheadMs={null} />,
    );
    await userEvent.click(screen.getByRole('button', { name: '패킷 101번, 정상 도착' }));
    expect(onSelect).toHaveBeenLastCalledWith(101);

    fireEvent.keyDown(screen.getByRole('button', { name: '패킷 103번, 지각' }), { key: 'Enter' });
    expect(onSelect).toHaveBeenLastCalledWith(103);
    fireEvent.keyDown(screen.getByRole('button', { name: '패킷 103번, 지각' }), { key: ' ' });
    expect(onSelect).toHaveBeenCalledTimes(3);
    expect(screen.getByRole('button', { name: '패킷 102번, 손실' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('labels late cells with visible text and leaves other cells unlabelled', () => {
    render(
      <PacketLanes packets={packets} nominalDelayMs={100} selectedSequence={null} onSelect={() => undefined} playheadMs={null} />,
    );
    expect(screen.getAllByText('지각')).toHaveLength(1);
    expect(screen.getByText('지각').closest('g')).toHaveAttribute('aria-label', '패킷 103번, 지각');
  });

  it('renders without packets', () => {
    render(
      <PacketLanes packets={[]} nominalDelayMs={100} selectedSequence={null} onSelect={() => undefined} playheadMs={null} />,
    );
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('wraps the lane SVG in a horizontally-scrollable, shrinkable container', () => {
    const { container } = render(
      <PacketLanes packets={packets} nominalDelayMs={100} selectedSequence={null} onSelect={() => undefined} playheadMs={null} />,
    );
    const scroller = container.querySelector('.lanes-scroll');
    expect(scroller).not.toBeNull();
    expect(container.querySelector('.lanes-frame')?.contains(scroller)).toBe(true);
  });
});

describe('RtpDetail', () => {
  it('prompts to select a packet when none is selected', () => {
    render(<RtpDetail packet={null} settings={settings} />);
    expect(screen.getByText('패킷을 눌러 RTP 헤더 정보를 확인하세요')).toBeInTheDocument();
  });

  it('shows the RTP header fields and an explanation', () => {
    render(<RtpDetail packet={packet(3)} settings={settings} />);
    const detail = screen.getByRole('region', { name: 'RTP Packet #104' });
    expect(within(detail).getByText('Sequence Number').nextSibling).toHaveTextContent('104');
    expect(within(detail).getByText('Timestamp').nextSibling).toHaveTextContent('2880');
    expect(within(detail).getByText('SSRC').nextSibling).toHaveTextContent('3192048');
    expect(within(detail).getByText('도착까지').nextSibling).toHaveTextContent('100 ms');
    expect(within(detail).getByText(/도착 즉시 재생되었습니다/)).toBeInTheDocument();
  });

  it('says a lost packet did not arrive', () => {
    render(<RtpDetail packet={packet(1, { status: 'lost', arrivalAtMs: null, playoutAtMs: null })} settings={settings} />);
    expect(screen.getByText('도착하지 않음')).toBeInTheDocument();
  });
});

describe('WaveCompare', () => {
  it('draws both waveforms and marks silent bins in the degraded one', () => {
    const { container } = render(<WaveCompare original={[1, 0.5, 0.2]} degraded={[1, 0, 0.2]} />);
    expect(container.querySelectorAll('.wave-bars')).toHaveLength(2);
    expect(container.querySelectorAll('.wave-bars')[0].querySelectorAll('i')).toHaveLength(3);
    expect(container.querySelectorAll('.wave-bars')[1].querySelectorAll('i.gap')).toHaveLength(1);
    expect(container.querySelectorAll('.wave-bars')[0].querySelectorAll('i.gap')).toHaveLength(0);
  });
});

describe('PacketOverview', () => {
  const overviewPackets = [packet(0), packet(1), packet(2)];

  it('draws a viewport rectangle at the given start and size', () => {
    const { container } = render(
      <PacketOverview packets={overviewPackets} onJump={() => undefined} viewportStart={0.25} viewportSize={0.5} />,
    );
    const viewportRect = container.querySelector('.overview-viewport');
    expect(viewportRect).not.toBeNull();
    expect(viewportRect).toHaveAttribute('x', '0.75');
    expect(viewportRect).toHaveAttribute('width', '1.5');
  });

  it('clamps a viewport that would run past either edge', () => {
    const { container } = render(
      <PacketOverview packets={overviewPackets} onJump={() => undefined} viewportStart={0.75} viewportSize={0.5} />,
    );
    const viewportRect = container.querySelector('.overview-viewport');
    expect(viewportRect).toHaveAttribute('x', '2.25');
    expect(viewportRect).toHaveAttribute('width', '0.75');
  });

  it('renders no viewport rectangle when there is nothing to scroll (full-width viewport)', () => {
    const { container } = render(
      <PacketOverview packets={overviewPackets} onJump={() => undefined} viewportStart={0} viewportSize={1} />,
    );
    expect(container.querySelector('.overview-viewport')).toBeNull();
  });

  it('calls onJump with the pointer-down ratio and again while dragging', () => {
    const onJump = vi.fn();
    const { container } = render(
      <PacketOverview packets={overviewPackets} onJump={onJump} viewportStart={0} viewportSize={0.5} />,
    );
    const svg = container.querySelector('svg.overview') as SVGSVGElement;
    vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      width: 100,
      top: 0,
      height: 8,
      right: 100,
      bottom: 8,
      x: 0,
      y: 0,
      toJSON: () => '',
    } as DOMRect);
    fireEvent.pointerDown(svg, { clientX: 20 });
    expect(onJump).toHaveBeenLastCalledWith(0.2);
    fireEvent.pointerMove(svg, { clientX: 60 });
    expect(onJump).toHaveBeenLastCalledWith(0.6);
    fireEvent.pointerUp(svg);
    fireEvent.pointerMove(svg, { clientX: 90 });
    expect(onJump).toHaveBeenCalledTimes(2);
  });
});
