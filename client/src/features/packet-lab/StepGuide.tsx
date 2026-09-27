import { packetLabContent } from '../../content/packetLab';

export function StepGuide() {
  return (
    <ol className="step-guide">
      {packetLabContent.steps.map((step, index) => (
        <li key={step.title} className="step-guide-item">
          <span className="step-badge" aria-hidden="true">
            {index + 1}
          </span>
          <span>
            <strong>{step.title}</strong> · {step.description}
          </span>
        </li>
      ))}
    </ol>
  );
}
