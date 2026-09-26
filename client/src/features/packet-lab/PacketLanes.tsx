import { useEffect, useMemo, useRef, type KeyboardEvent, type RefObject } from 'react';
import { packetLabContent } from '../../content/packetLab';
import type { SimulatedPacket } from '../../engine/types';
import {
  CELL_HEIGHT,
  CELL_WIDTH,
  RECEIVER_Y,
  SENDER_Y,
  SVG_HEIGHT,
  buildLaneLayout,
  xOf,
  type LaneLayout,
  type ReceiverCell,
} from './laneLayout';
import { PacketOverview } from './PacketOverview';
import './lanes.css';

interface PacketLanesProps {
  packets: SimulatedPacket[];
  nominalDelayMs: number;
  selectedSequence: number | null;
  onSelect: (sequenceNumber: number) => void;
  playheadMs: number | null;
}

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function useLaneScroll(playheadMs: number | null): {
  scrollerRef: RefObject<HTMLDivElement | null>;
  jumpTo: (ratio: number) => void;
} {
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (playheadMs === null || !scroller || prefersReducedMotion()) {
      return;
    }
    scroller.scrollLeft = Math.max(0, xOf(playheadMs) - scroller.clientWidth / 3);
  }, [playheadMs]);

  const jumpTo = (ratio: number) => {
    const scroller = scrollerRef.current;
    if (scroller) {
      scroller.scrollLeft = Math.max(0, ratio * scroller.scrollWidth - scroller.clientWidth / 2);
    }
  };

  return { scrollerRef, jumpTo };
}

function LaneLabels() {
  const { lanes } = packetLabContent;
  return (
    <>
      <div className="lane-label" style={{ top: SENDER_Y - 8 }}>
        <strong>{lanes.sender}</strong>
        <span>{lanes.senderCaption}</span>
      </div>
      <div className="lane-label" style={{ top: RECEIVER_Y - 8 }}>
        <strong>{lanes.receiver}</strong>
        <span>{lanes.receiverCaption}</span>
      </div>
    </>
  );
}

function LaneRules({ width }: { width: number }) {
  return (
    <>
      <line className="lane-rule" x1={0} x2={width} y1={SENDER_Y + CELL_HEIGHT / 2} y2={SENDER_Y + CELL_HEIGHT / 2} />
      <line className="lane-rule" x1={0} x2={width} y1={RECEIVER_Y + CELL_HEIGHT / 2} y2={RECEIVER_Y + CELL_HEIGHT / 2} />
    </>
  );
}

function LaneLines({ lines }: { lines: LaneLayout['lines'] }) {
  return (
    <>
      {lines.map((line) => (
        <line
          key={line.sequenceNumber}
          className={line.late ? 'lane-line late' : 'lane-line'}
          x1={line.x1}
          y1={SENDER_Y + CELL_HEIGHT}
          x2={line.x2}
          y2={RECEIVER_Y}
        />
      ))}
    </>
  );
}

function SenderCells({ senders }: { senders: LaneLayout['senders'] }) {
  return (
    <>
      {senders.map((cell) => (
        <g key={cell.sequenceNumber} aria-hidden="true">
          <rect className="cell-rect on-time" x={cell.x} y={SENDER_Y} width={CELL_WIDTH} height={CELL_HEIGHT} rx={5} />
          <text className="cell-text on-time" x={cell.x + CELL_WIDTH / 2} y={SENDER_Y + 16}>
            {cell.sequenceNumber}
          </text>
        </g>
      ))}
    </>
  );
}

interface ReceiverCellViewProps {
  cell: ReceiverCell;
  selected: boolean;
  onSelect: (sequenceNumber: number) => void;
}

function ReceiverCellView({ cell, selected, onSelect }: ReceiverCellViewProps) {
  const { lanes } = packetLabContent;
  const state = lanes.states[cell.status] + (cell.reordered ? lanes.reorderedSuffix : '');
  const activate = (event: KeyboardEvent<SVGGElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect(cell.sequenceNumber);
    }
  };

  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={lanes.packetLabel(cell.sequenceNumber, state)}
      aria-pressed={selected}
      className="lane-cell"
      onClick={() => onSelect(cell.sequenceNumber)}
      onKeyDown={activate}
    >
      <rect
        className={`cell-rect ${cell.status}${selected ? ' selected' : ''}`}
        x={cell.x}
        y={RECEIVER_Y}
        width={CELL_WIDTH}
        height={CELL_HEIGHT}
        rx={5}
      />
      <text className={`cell-text ${cell.status}`} x={cell.x + CELL_WIDTH / 2} y={RECEIVER_Y + 16}>
        {cell.status === 'lost' ? '✕' : cell.sequenceNumber}
      </text>
      {cell.status === 'late' ? (
        <text className="cell-flag late" x={cell.x + CELL_WIDTH / 2} y={RECEIVER_Y - 4}>
          {lanes.states.late}
        </text>
      ) : null}
      {cell.reordered ? (
        <text className="cell-flag" x={cell.x + CELL_WIDTH / 2} y={RECEIVER_Y + CELL_HEIGHT + 14}>
          ↕
        </text>
      ) : null}
    </g>
  );
}

function Playhead({ playheadMs }: { playheadMs: number | null }) {
  if (playheadMs === null) {
    return null;
  }
  return (
    <line
      className="playhead"
      x1={xOf(playheadMs)}
      x2={xOf(playheadMs)}
      y1={SENDER_Y - 12}
      y2={RECEIVER_Y + CELL_HEIGHT + 8}
    />
  );
}

function Legend() {
  const { legend } = packetLabContent;
  return (
    <ul className="legend">
      <li>
        <span className="swatch on-time" />
        {legend.onTime}
      </li>
      <li>
        <span className="swatch late" />
        {legend.late}
      </li>
      <li>
        <span className="swatch lost" />
        {legend.lost}
      </li>
      <li>{legend.reordered}</li>
      <li>{legend.lines}</li>
    </ul>
  );
}

export function PacketLanes({ packets, nominalDelayMs, selectedSequence, onSelect, playheadMs }: PacketLanesProps) {
  const { lanes } = packetLabContent;
  const layout = useMemo(() => buildLaneLayout(packets, nominalDelayMs), [packets, nominalDelayMs]);
  const { scrollerRef, jumpTo } = useLaneScroll(playheadMs);

  return (
    <div className="lanes">
      <div className="lanes-frame">
        <LaneLabels />
        <div ref={scrollerRef} className="lanes-scroll" role="region" aria-label={lanes.regionLabel} tabIndex={0}>
          <svg width={layout.width} height={SVG_HEIGHT} viewBox={`0 0 ${layout.width} ${SVG_HEIGHT}`}>
            <LaneRules width={layout.width} />
            <LaneLines lines={layout.lines} />
            <SenderCells senders={layout.senders} />
            {layout.receivers.map((cell) => (
              <ReceiverCellView
                key={cell.sequenceNumber}
                cell={cell}
                selected={cell.sequenceNumber === selectedSequence}
                onSelect={onSelect}
              />
            ))}
            <Playhead playheadMs={playheadMs} />
            <text className="axis-label" x={layout.width - 8} y={SVG_HEIGHT - 6}>
              {lanes.timeAxis}
            </text>
          </svg>
        </div>
      </div>

      <PacketOverview packets={packets} onJump={jumpTo} />
      <Legend />
    </div>
  );
}
