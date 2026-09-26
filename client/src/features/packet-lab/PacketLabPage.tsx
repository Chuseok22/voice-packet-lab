import type { ReactNode } from 'react';
import { packetLabContent } from '../../content/packetLab';
import { ClipProvider, useClip } from './ClipProvider';
import { ConditionSliders } from './ConditionSliders';
import { describeSettings } from './format';
import { MetricsPanel } from './MetricsPanel';
import { PacketLanes } from './PacketLanes';
import { PlayBar } from './PlayBar';
import { RtpDetail } from './RtpDetail';
import { ScenarioChips } from './ScenarioChips';
import { SimulationNotice } from './SimulationNotice';
import { StepGuide } from './StepGuide';
import { usePacketLab, type PacketLabModel } from './usePacketLab';
import { WaveCompare } from './WaveCompare';
import './packet-lab.css';

interface PacketLabPageProps {
  presenterPanel?: ReactNode;
}

interface WorkspaceProps extends PacketLabPageProps {
  frames: Float32Array[];
  sourceLabel: string;
}

function NumberedCardHeader({ step, title, hint }: { step: number; title: string; hint?: string }) {
  return (
    <div className="card-header">
      <h2 className="card-title">
        <span className="step-badge" aria-hidden="true">{step}</span>
        {title}
      </h2>
      {hint ? <span className="hint">{hint}</span> : null}
    </div>
  );
}

function LabControls({ lab, presenterPanel }: { lab: PacketLabModel } & PacketLabPageProps) {
  const { cards } = packetLabContent;
  return (
    <div className="lab-controls">
      <section className="card">
        <NumberedCardHeader step={1} title={cards.scenario} />
        <ScenarioChips activeId={lab.scenarioId} onChoose={lab.chooseScenario} />
      </section>
      <section className="card">
        <NumberedCardHeader step={2} title={cards.conditions} />
        <ConditionSliders settings={lab.settings} onChange={lab.updateSettings} />
      </section>
      {presenterPanel}
    </div>
  );
}

function LanesCard({ lab }: { lab: PacketLabModel }) {
  const { cards, hints } = packetLabContent;
  return (
    <section className="card">
      <NumberedCardHeader step={4} title={cards.lanes} hint={hints.lanes} />
      <PacketLanes
        packets={lab.result.packets}
        nominalDelayMs={lab.settings.delayMs}
        selectedSequence={lab.selectedPacket?.sequenceNumber ?? null}
        onSelect={lab.selectPacket}
        playheadMs={lab.playheadMs}
      />
      <RtpDetail packet={lab.selectedPacket} settings={lab.settings} />
    </section>
  );
}

function PacketLabWorkspace({ frames, sourceLabel, presenterPanel }: WorkspaceProps) {
  const lab = usePacketLab(frames);
  const { cards } = packetLabContent;

  return (
    <div className="lab">
      <header className="lab-head">
        <h1>{packetLabContent.title}</h1>
        <p>{packetLabContent.tagline}</p>
      </header>

      <div className="lab-steps">
        <StepGuide />
      </div>

      <LabControls lab={lab} presenterPanel={presenterPanel} />

      <div className="lab-results">
        <LanesCard lab={lab} />
        <section className="card">
          <div className="card-header">
            <h2 className="card-title">{cards.compare}</h2>
          </div>
          <WaveCompare original={lab.waveforms.original} degraded={lab.waveforms.degraded} />
          <MetricsPanel metrics={lab.result.metrics} bufferEnabled={lab.settings.bufferMs > 0} />
        </section>
      </div>

      <div className="lab-notice">
        <SimulationNotice />
      </div>

      <div className="lab-play">
        <PlayBar
          playing={lab.playing}
          settingsSummary={describeSettings(lab.settings)}
          sourceLabel={sourceLabel}
          error={lab.playbackError}
          onToggle={lab.togglePlayback}
        />
      </div>
    </div>
  );
}

function PacketLabView({ presenterPanel }: PacketLabPageProps) {
  const { frames, sourceLabel, loadError } = useClip();
  if (loadError) {
    return (
      <p className="card" role="alert">
        {loadError}
      </p>
    );
  }
  if (!frames) {
    return (
      <p className="card" role="status">
        {packetLabContent.loading}
      </p>
    );
  }
  return <PacketLabWorkspace frames={frames} sourceLabel={sourceLabel} presenterPanel={presenterPanel} />;
}

export function PacketLabPage({ presenterPanel }: PacketLabPageProps) {
  return (
    <ClipProvider>
      <PacketLabView presenterPanel={presenterPanel} />
    </ClipProvider>
  );
}
