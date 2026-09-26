import { packetLabContent } from '../../content/packetLab';
import { SCENARIOS, type ScenarioId } from '../../engine/settings';

interface ScenarioChipsProps {
  activeId: ScenarioId | null;
  onChoose: (id: ScenarioId) => void;
}

export function ScenarioChips({ activeId, onChoose }: ScenarioChipsProps) {
  return (
    <div className="chips" role="group" aria-label={packetLabContent.cards.scenario}>
      {SCENARIOS.map(({ id }) => (
        <button key={id} type="button" className="chip" aria-pressed={id === activeId} onClick={() => onChoose(id)}>
          {packetLabContent.scenarios[id]}
        </button>
      ))}
    </div>
  );
}
