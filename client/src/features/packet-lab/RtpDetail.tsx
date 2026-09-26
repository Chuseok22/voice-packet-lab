import { packetLabContent } from '../../content/packetLab';
import type { NetworkSettings, SimulatedPacket } from '../../engine/types';
import { describePacket } from './describePacket';
import { formatMs } from './format';

interface RtpDetailProps {
  packet: SimulatedPacket | null;
  settings: NetworkSettings;
}

export function RtpDetail({ packet, settings }: RtpDetailProps) {
  const { rtp } = packetLabContent;
  if (!packet) {
    return <p className="rtp-empty">{rtp.empty}</p>;
  }

  const travel = packet.arrivalAtMs === null ? rtp.lostValue : formatMs(packet.arrivalAtMs - packet.sentAtMs);
  return (
    <section className="rtp" aria-label={rtp.title(packet.sequenceNumber)} aria-live="polite">
      <h3>{rtp.title(packet.sequenceNumber)}</h3>
      <dl className="rtp-fields">
        <div>
          <dt>{rtp.sequence}</dt>
          <dd>{packet.sequenceNumber}</dd>
        </div>
        <div>
          <dt>{rtp.timestamp}</dt>
          <dd>{packet.timestamp}</dd>
        </div>
        <div>
          <dt>{rtp.ssrc}</dt>
          <dd>{packet.ssrc}</dd>
        </div>
        <div>
          <dt>{rtp.travel}</dt>
          <dd>{travel}</dd>
        </div>
      </dl>
      <p className="rtp-explain">{describePacket(packet, settings)}</p>
    </section>
  );
}
