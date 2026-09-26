import { Link } from 'react-router-dom';
import { connectionContent } from '../../content/connection';
import { stepStatuses } from './connectionMachine';
import { MessageLog } from './MessageLog';
import { RequestResponsePanel } from './RequestResponsePanel';
import { StepTimeline } from './StepTimeline';
import { describeStatus, useConnection, type ConnectionModel } from './useConnection';
import './connection.css';

function ConnectionControls({ state, connect, sendIdentify }: ConnectionModel) {
  const { actions } = connectionContent;
  const isSnapshot = state.source === 'snapshot';
  const connecting = state.phase === 'connecting';

  return (
    <section className="card connection-controls" aria-label={actions.connect}>
      <p
        className={isSnapshot ? 'connection-status banner-snapshot' : 'connection-status'}
        role={state.phase === 'error' ? 'alert' : 'status'}
      >
        {describeStatus(state)}
      </p>
      <div className="connection-buttons">
        <button type="button" className="button button-primary" disabled={connecting} onClick={connect}>
          {state.phase === 'idle' || state.phase === 'connecting' ? actions.connect : actions.reconnect}
        </button>
        <button type="button" className="button" disabled={state.phase !== 'hello'} onClick={sendIdentify}>
          {actions.sendIdentify}
        </button>
        {state.phase === 'ready' ? (
          <Link className="button button-primary" to="/">
            {actions.toPacketLab}
          </Link>
        ) : null}
      </div>
      {state.heartbeatCount > 0 ? (
        <p className="connection-heartbeat">{connectionContent.heartbeat(state.heartbeatCount, state.lastRttMs)}</p>
      ) : null}
    </section>
  );
}

export function ConnectionPage() {
  const model = useConnection();
  const { state } = model;
  const { log } = connectionContent;

  return (
    <div className="connection">
      <header className="connection-head">
        <h1>{connectionContent.title}</h1>
        <p>{connectionContent.tagline}</p>
      </header>

      <p className="connection-notice">{connectionContent.notice}</p>

      <ConnectionControls {...model} />

      <div className="connection-grid">
        <section className="card">
          <h2 className="card-title">{connectionContent.timeline.title}</h2>
          <StepTimeline statuses={stepStatuses(state)} />
        </section>
        <div className="connection-side">
          <section className="card">
            <h2 className="card-title">{connectionContent.panel.request} / {connectionContent.panel.response}</h2>
            <RequestResponsePanel handshake={state.handshake} />
          </section>
          <section className="card">
            <h2 className="card-title">{log.title}</h2>
            <MessageLog entries={state.log} />
          </section>
        </div>
      </div>
    </div>
  );
}
