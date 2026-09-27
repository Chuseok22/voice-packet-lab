import { useRef, type PointerEvent } from 'react';
import { packetLabContent } from '../../content/packetLab';
import type { SimulatedPacket } from '../../engine/types';

interface PacketOverviewProps {
  packets: SimulatedPacket[];
  onJump: (ratio: number) => void;
  viewportStart: number;
  viewportSize: number;
}

function ratioFromPointer(svg: SVGSVGElement, clientX: number): number {
  const bounds = svg.getBoundingClientRect();
  if (bounds.width <= 0) {
    return 0;
  }
  return Math.min(1, Math.max(0, (clientX - bounds.left) / bounds.width));
}

export function PacketOverview({ packets, onJump, viewportStart, viewportSize }: PacketOverviewProps) {
  const draggingRef = useRef(false);
  const total = Math.max(1, packets.length);

  const handlePointerDown = (event: PointerEvent<SVGSVGElement>) => {
    draggingRef.current = true;
    // jsdom (used by the test suite) does not implement setPointerCapture; guard it so
    // dragging still works in a real browser without throwing in tests.
    if (typeof event.currentTarget.setPointerCapture === 'function') {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    onJump(ratioFromPointer(event.currentTarget, event.clientX));
  };

  const handlePointerMove = (event: PointerEvent<SVGSVGElement>) => {
    if (!draggingRef.current) {
      return;
    }
    onJump(ratioFromPointer(event.currentTarget, event.clientX));
  };

  const stopDragging = () => {
    draggingRef.current = false;
  };

  const clampedStart = Math.min(1, Math.max(0, viewportStart));
  const clampedSize = Math.min(1 - clampedStart, Math.max(0, viewportSize));
  const showViewport = clampedSize > 0 && clampedSize < 1;

  return (
    <svg
      className="overview"
      viewBox={`0 0 ${total} 8`}
      preserveAspectRatio="none"
      role="img"
      aria-label={packetLabContent.lanes.overviewLabel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={stopDragging}
      onPointerCancel={stopDragging}
    >
      {packets.map((packet, index) => (
        <rect key={packet.sequenceNumber} x={index} y={0} width={1} height={8} className={`overview-cell ${packet.status}`} />
      ))}
      {showViewport ? (
        <rect
          className="overview-viewport"
          x={clampedStart * total}
          y={0}
          width={clampedSize * total}
          height={8}
        />
      ) : null}
    </svg>
  );
}
