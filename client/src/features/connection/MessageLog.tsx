import { connectionContent } from '../../content/connection';
import type { LogEntry } from './connectionMachine';

interface MessageLogProps {
  entries: LogEntry[];
}

export function MessageLog({ entries }: MessageLogProps) {
  const { log } = connectionContent;
  if (entries.length === 0) {
    return <p className="panel-empty">{log.empty}</p>;
  }
  return (
    <ol className="message-log" aria-live="polite">
      {entries.map((entry) => (
        <li key={entry.id} className={`message message-${entry.direction}`}>
          <div className="message-head">
            <span className="message-direction">{entry.direction === 'sent' ? log.sent : log.received}</span>
            <strong>{entry.name}</strong>
          </div>
          <pre>{entry.body}</pre>
        </li>
      ))}
    </ol>
  );
}
