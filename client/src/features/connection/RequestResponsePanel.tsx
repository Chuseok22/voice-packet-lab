import { useState } from 'react';
import { connectionContent } from '../../content/connection';
import { hintForLine, isHighlightedLine } from './headerHints';

interface RawTextProps {
  title: string;
  text: string;
  selected: string | null;
  onSelect: (line: string) => void;
}

function RawText({ title, text, selected, onSelect }: RawTextProps) {
  return (
    <div className="raw">
      <h3>{title}</h3>
      <ol className="raw-lines">
        {text
          .split('\n')
          .filter((line) => line.trim() !== '')
          .map((line, index) => (
            <li key={`${index}-${line}`}>
              <button
                type="button"
                className={isHighlightedLine(line) ? 'raw-line raw-line-key' : 'raw-line'}
                aria-pressed={selected === line}
                onClick={() => onSelect(line)}
              >
                {line}
              </button>
            </li>
          ))}
      </ol>
    </div>
  );
}

interface RequestResponsePanelProps {
  handshake: { request: string; response: string } | null;
}

export function RequestResponsePanel({ handshake }: RequestResponsePanelProps) {
  const { panel } = connectionContent;
  const [selected, setSelected] = useState<string | null>(null);

  if (!handshake) {
    return <p className="panel-empty">{panel.waiting}</p>;
  }

  const hint = selected === null ? panel.hint : (hintForLine(selected) ?? panel.noHint);
  return (
    <div className="panel">
      <div className="raw-columns">
        <RawText title={panel.request} text={handshake.request} selected={selected} onSelect={setSelected} />
        <RawText title={panel.response} text={handshake.response} selected={selected} onSelect={setSelected} />
      </div>
      <p className="panel-hint" role="status">
        {hint}
      </p>
    </div>
  );
}
