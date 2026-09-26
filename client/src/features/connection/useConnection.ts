import { useCallback, useEffect, useReducer, useRef, type Dispatch, type MutableRefObject } from 'react';
import { connectionContent } from '../../content/connection';
import {
  connectionReducer,
  initialConnectionState,
  type ConnectionEvent,
  type ConnectionState,
} from './connectionMachine';
import { DEMO_IDENTIFY_MESSAGE, connectGateway, type GatewayConnection } from './gatewayClient';
import { snapshotData } from './snapshotData';

const SNAPSHOT_READY_DELAY_MS = 300;
const SNAPSHOT_HEARTBEAT_DELAY_MS = 600;
const SNAPSHOT_ACK_DELAY_MS = 900;

export interface ConnectionModel {
  state: ConnectionState;
  connect: () => void;
  sendIdentify: () => void;
}

function startSnapshot(dispatch: Dispatch<ConnectionEvent>): void {
  dispatch({ type: 'handshake-received', source: 'snapshot', request: snapshotData.request, response: snapshotData.response });
  dispatch({ type: 'server-message', message: snapshotData.hello });
}

function useSnapshotPlayback(dispatch: Dispatch<ConnectionEvent>) {
  const timersRef = useRef<number[]>([]);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
  }, []);

  const schedule = useCallback((delayMs: number, action: () => void) => {
    timersRef.current.push(window.setTimeout(action, delayMs));
  }, []);

  const playIdentify = useCallback(() => {
    if (timersRef.current.length > 0) return;
    dispatch({ type: 'client-message', message: DEMO_IDENTIFY_MESSAGE });
    schedule(SNAPSHOT_READY_DELAY_MS, () => dispatch({ type: 'server-message', message: snapshotData.ready }));
    schedule(SNAPSHOT_HEARTBEAT_DELAY_MS, () =>
      dispatch({ type: 'client-message', message: snapshotData.heartbeat.sent }),
    );
    schedule(SNAPSHOT_ACK_DELAY_MS, () => {
      dispatch({ type: 'server-message', message: snapshotData.heartbeat.ack });
      dispatch({ type: 'heartbeat-acked', rttMs: snapshotData.heartbeat.rttMs });
    });
  }, [dispatch, schedule]);

  return { clearTimers, playIdentify };
}

function openLiveConnection(
  dispatch: Dispatch<ConnectionEvent>,
  connectionRef: MutableRefObject<GatewayConnection | null>,
): GatewayConnection {
  return connectGateway({
    onHandshake: (request, response) => dispatch({ type: 'handshake-received', source: 'live', request, response }),
    onMessage: (message) => dispatch({ type: 'server-message', message }),
    onSent: (message) => dispatch({ type: 'client-message', message }),
    onHeartbeatAck: (rttMs) => dispatch({ type: 'heartbeat-acked', rttMs }),
    onFailure: (reason, handshakeSeen) => {
      connectionRef.current = null;
      if (handshakeSeen) {
        dispatch({ type: 'failed', reason });
      } else {
        startSnapshot(dispatch);
      }
    },
  });
}

export function useConnection(): ConnectionModel {
  const [state, dispatch] = useReducer(connectionReducer, initialConnectionState);
  const connectionRef = useRef<GatewayConnection | null>(null);
  const { clearTimers, playIdentify } = useSnapshotPlayback(dispatch);

  const cleanup = useCallback(() => {
    connectionRef.current?.close();
    connectionRef.current = null;
    clearTimers();
  }, [clearTimers]);

  useEffect(() => cleanup, [cleanup]);

  const connect = useCallback(() => {
    cleanup();
    dispatch({ type: 'connect-started' });
    connectionRef.current = openLiveConnection(dispatch, connectionRef);
  }, [cleanup]);

  const sendIdentify = useCallback(() => {
    if (state.source === 'snapshot') {
      playIdentify();
    } else {
      connectionRef.current?.sendIdentify();
    }
  }, [state.source, playIdentify]);

  return { state, connect, sendIdentify };
}

export function describeStatus(state: ConnectionState): string {
  const { status, errors } = connectionContent;
  switch (state.phase) {
    case 'idle':
      return status.idle;
    case 'connecting':
      return status.connecting;
    case 'error':
      return state.errorMessage ?? errors.dropped;
    default:
      return state.source === 'snapshot' ? status.snapshot : status.live;
  }
}
