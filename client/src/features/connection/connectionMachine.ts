import { Opcode, opcodeName, type ClientMessage, type ServerMessage } from '@voice-packet-lab/shared';
import { CONNECTION_STEPS } from '../../content/connection';

export type ConnectionPhase = 'idle' | 'connecting' | 'handshake' | 'hello' | 'ready' | 'error';
export type ConnectionSource = 'live' | 'snapshot';

export interface LogEntry {
  id: number;
  direction: 'sent' | 'received';
  name: string;
  body: string;
}

export interface ConnectionState {
  phase: ConnectionPhase;
  source: ConnectionSource | null;
  handshake: { request: string; response: string } | null;
  log: LogEntry[];
  heartbeatIntervalMs: number | null;
  heartbeatCount: number;
  lastRttMs: number | null;
  errorMessage: string | null;
  nextLogId: number;
}

export type ConnectionEvent =
  | { type: 'connect-started' }
  | { type: 'handshake-received'; source: ConnectionSource; request: string; response: string }
  | { type: 'server-message'; message: ServerMessage }
  | { type: 'client-message'; message: ClientMessage }
  | { type: 'heartbeat-acked'; rttMs: number }
  | { type: 'failed'; reason: string };

export type StepStatus = 'done' | 'active' | 'pending';

const MAX_LOG_ENTRIES = 50;
const LOGGED_HEARTBEATS = 3;
const STEP_COUNT = CONNECTION_STEPS.length;
const STEPS_DONE_AFTER_HANDSHAKE = 4;
const STEPS_DONE_AFTER_HELLO = 5;
const STEPS_DONE_AFTER_READY = 7;

export const initialConnectionState: ConnectionState = {
  phase: 'idle',
  source: null,
  handshake: null,
  log: [],
  heartbeatIntervalMs: null,
  heartbeatCount: 0,
  lastRttMs: null,
  errorMessage: null,
  nextLogId: 1,
};

function isHeartbeatTraffic(message: ClientMessage | ServerMessage): boolean {
  return message.op === Opcode.Heartbeat || message.op === Opcode.HeartbeatAck;
}

function appendLog(
  state: ConnectionState,
  direction: LogEntry['direction'],
  message: ClientMessage | ServerMessage,
): ConnectionState {
  const entry: LogEntry = {
    id: state.nextLogId,
    direction,
    name: opcodeName(message.op),
    body: JSON.stringify(message, null, 2),
  };
  return { ...state, log: [...state.log, entry].slice(-MAX_LOG_ENTRIES), nextLogId: state.nextLogId + 1 };
}

export function connectionReducer(state: ConnectionState, event: ConnectionEvent): ConnectionState {
  switch (event.type) {
    case 'connect-started':
      return { ...initialConnectionState, phase: 'connecting' };
    case 'handshake-received':
      return {
        ...state,
        phase: 'handshake',
        source: event.source,
        handshake: { request: event.request, response: event.response },
      };
    case 'server-message': {
      const { message } = event;
      if (isHeartbeatTraffic(message) && state.heartbeatCount >= LOGGED_HEARTBEATS) return state;
      const logged = appendLog(state, 'received', message);
      if (message.op === Opcode.Hello) {
        return { ...logged, phase: 'hello', heartbeatIntervalMs: message.d.heartbeat_interval };
      }
      return message.op === Opcode.Ready ? { ...logged, phase: 'ready' } : logged;
    }
    case 'client-message':
      if (isHeartbeatTraffic(event.message) && state.heartbeatCount >= LOGGED_HEARTBEATS) return state;
      return appendLog(state, 'sent', event.message);
    case 'heartbeat-acked':
      return { ...state, heartbeatCount: state.heartbeatCount + 1, lastRttMs: event.rttMs };
    case 'failed':
      return { ...state, phase: 'error', errorMessage: event.reason };
  }
}

function hasReceived(state: ConnectionState, opcode: number): boolean {
  const name = opcodeName(opcode);
  return state.log.some((entry) => entry.direction === 'received' && entry.name === name);
}

function completedStepsBeforeError(state: ConnectionState): number {
  if (hasReceived(state, Opcode.Ready)) {
    return state.heartbeatCount > 0 ? STEP_COUNT : STEPS_DONE_AFTER_READY;
  }
  if (hasReceived(state, Opcode.Hello)) return STEPS_DONE_AFTER_HELLO;
  return state.handshake ? STEPS_DONE_AFTER_HANDSHAKE : 0;
}

function completedSteps(state: ConnectionState): number {
  switch (state.phase) {
    case 'idle':
      return -1;
    case 'connecting':
      return 0;
    case 'handshake':
      return STEPS_DONE_AFTER_HANDSHAKE;
    case 'hello':
      return STEPS_DONE_AFTER_HELLO;
    case 'ready':
      return state.heartbeatCount > 0 ? STEP_COUNT : STEPS_DONE_AFTER_READY;
    case 'error':
      return completedStepsBeforeError(state);
  }
}

export function stepStatuses(state: ConnectionState): StepStatus[] {
  const completed = completedSteps(state);
  return CONNECTION_STEPS.map((_, index) => {
    if (completed < 0) return 'pending';
    if (index < completed) return 'done';
    return index === completed ? 'active' : 'pending';
  });
}
