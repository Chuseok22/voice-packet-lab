import type { MouseEvent } from 'react';
import { packetLabContent } from '../../content/packetLab';
import type { SimulatedPacket } from '../../engine/types';

interface PacketOverviewProps {
  packets: SimulatedPacket[];
  onJump: (ratio: number) => void;
}

export function PacketOverview({ packets, onJump }: PacketOverviewProps) {
  const handleClick = (event: MouseEvent<SVGSVGElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    if (bounds.width > 0) {
      onJump(Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width)));
    }
  };

  return (
    <svg
      className="overview"
      viewBox={`0 0 ${Math.max(1, packets.length)} 8`}
      preserveAspectRatio="none"
      role="img"
      aria-label={packetLabContent.lanes.overviewLabel}
      onClick={handleClick}
    >
      {packets.map((packet, index) => (
        <rect key={packet.sequenceNumber} x={index} y={0} width={1} height={8} className={`overview-cell ${packet.status}`} />
      ))}
    </svg>
  );
}
