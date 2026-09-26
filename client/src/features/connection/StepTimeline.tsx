import { CONNECTION_STEPS, connectionContent, type ConnectionStepContent } from '../../content/connection';
import type { StepStatus } from './connectionMachine';

interface StepItemProps {
  step: ConnectionStepContent;
  index: number;
  status: StepStatus;
}

function StepItem({ step, index, status }: StepItemProps) {
  const { timeline } = connectionContent;
  return (
    <li className={`step step-${status}`} aria-current={status === 'active' ? 'step' : undefined}>
      <span className="step-badge" aria-hidden="true">
        {index + 1}
      </span>
      <div className="step-body">
        <div className="step-head">
          <strong>{step.title}</strong>
          <span className={`tag tag-${step.layer}`}>{timeline.layers[step.layer]}</span>
          <span className={`tag tag-${step.kind}`}>{timeline.kinds[step.kind]}</span>
        </div>
        <p>{step.summary}</p>
        <details>
          <summary>{timeline.more}</summary>
          <p>{step.detail}</p>
          <p className="step-source">
            {timeline.source}: {step.source}
          </p>
        </details>
      </div>
    </li>
  );
}

interface StepTimelineProps {
  statuses: StepStatus[];
}

export function StepTimeline({ statuses }: StepTimelineProps) {
  return (
    <ol className="timeline" aria-label={connectionContent.timeline.title}>
      {CONNECTION_STEPS.map((step, index) => (
        <StepItem key={step.id} step={step} index={index} status={statuses[index]} />
      ))}
    </ol>
  );
}
