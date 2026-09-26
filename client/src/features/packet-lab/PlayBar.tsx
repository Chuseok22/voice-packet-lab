import { packetLabContent } from '../../content/packetLab';
import type { PlaybackKind } from './usePacketLab';

interface PlayBarProps {
  playing: PlaybackKind | null;
  settingsSummary: string;
  sourceLabel: string;
  error: string | null;
  onToggle: (kind: PlaybackKind) => void;
}

export function PlayBar({ playing, settingsSummary, sourceLabel, error, onToggle }: PlayBarProps) {
  const { play, cards, hints } = packetLabContent;
  return (
    <section className="play-bar card" aria-label={cards.listen}>
      <div className="card-header">
        <h2 className="card-title">
          <span className="step-badge" aria-hidden="true">
            3
          </span>
          {cards.listen}
        </h2>
        <span className="hint">{hints.listen}</span>
      </div>
      <div className="play-buttons">
        <button
          type="button"
          className="button button-primary play-button"
          aria-pressed={playing === 'degraded'}
          onClick={() => onToggle('degraded')}
        >
          {playing === 'degraded' ? `■ ${play.stop}` : `▶ ${play.degraded}`}
          <small>{settingsSummary}</small>
        </button>
        <button
          type="button"
          className="button play-button"
          aria-pressed={playing === 'original'}
          onClick={() => onToggle('original')}
        >
          {playing === 'original' ? `■ ${play.stop}` : `▶ ${play.original}`}
          <small>{sourceLabel}</small>
        </button>
      </div>
      {error ? (
        <p className="play-error" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
