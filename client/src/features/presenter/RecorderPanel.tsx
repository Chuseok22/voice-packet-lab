import { useEffect, useRef, useState, type ChangeEvent, type RefObject } from 'react';
import { decodeAudioFile, type DecodedClip } from '../../audio/clip';
import { packetLabContent } from '../../content/packetLab';
import { presenterContent } from '../../content/presenter';
import { MAX_CLIP_SECONDS } from '../../engine/constants';
import { useClip } from '../packet-lab/ClipProvider';
import { RecordingError, startRecording, type RecordingSession } from './recordClip';
import './presenter.css';

type Status = 'idle' | 'starting' | 'recording' | 'processing';

interface Message {
  tone: 'info' | 'error';
  text: string;
}

function errorMessage(error: unknown): Message {
  return {
    tone: 'error',
    text: error instanceof RecordingError ? error.message : presenterContent.errors.micFailed,
  };
}

type SetStatus = (status: Status) => void;
type SetMessage = (message: Message | null) => void;

function useDecodeAndApply(setStatus: SetStatus, setMessage: SetMessage) {
  const { recorder } = presenterContent;
  const { replaceClip } = useClip();

  const apply = (clip: DecodedClip, label: string) => {
    const error = replaceClip(clip.samples, label);
    setMessage(
      error
        ? { tone: 'error', text: error }
        : { tone: 'info', text: clip.truncated ? recorder.truncated(MAX_CLIP_SECONDS) : recorder.applied },
    );
  };

  return async (data: ArrayBuffer | Promise<ArrayBuffer>, label: string) => {
    setStatus('processing');
    try {
      apply(await decodeAudioFile(await data), label);
    } catch {
      setMessage({ tone: 'error', text: presenterContent.errors.decode });
    } finally {
      setStatus('idle');
    }
  };
}

function stopQuietly(session: RecordingSession | null): void {
  // 녹음 결과를 쓰지 않는 정리 경로이므로 마이크만 끄고 실패는 무시한다.
  void session?.stop().catch(() => undefined);
}

function useMicCleanup(sessionRef: RefObject<RecordingSession | null>): RefObject<boolean> {
  const unmountedRef = useRef(false);

  useEffect(() => {
    unmountedRef.current = false;
    return () => {
      unmountedRef.current = true;
      stopQuietly(sessionRef.current);
    };
  }, [sessionRef]);

  return unmountedRef;
}

function useRecorder() {
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState<Message | null>(null);
  const sessionRef = useRef<RecordingSession | null>(null);
  const unmountedRef = useMicCleanup(sessionRef);
  const decodeAndApply = useDecodeAndApply(setStatus, setMessage);

  const finishRecording = async () => {
    const session = sessionRef.current;
    if (!session) return;
    sessionRef.current = null;
    setStatus('processing');
    try {
      await decodeAndApply(await session.stop(), packetLabContent.sourceLabels.recorded);
    } catch (error) {
      setStatus('idle');
      setMessage(errorMessage(error));
    }
  };

  const beginRecording = async () => {
    setMessage(null);
    setStatus('starting');
    try {
      const session = await startRecording(MAX_CLIP_SECONDS, () => void finishRecording());
      if (unmountedRef.current) {
        stopQuietly(session);
        return;
      }
      sessionRef.current = session;
      setStatus('recording');
    } catch (error) {
      setStatus('idle');
      setMessage(errorMessage(error));
    }
  };

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setMessage(null);
    await decodeAndApply(file.arrayBuffer(), packetLabContent.sourceLabels.uploaded);
  };

  return { status, message, beginRecording, finishRecording, handleFile };
}

interface RecorderActionsProps {
  status: Status;
  onRecord: () => void;
  onStop: () => void;
  onFile: (event: ChangeEvent<HTMLInputElement>) => void;
  onReset: () => void;
}

function RecorderActions({ status, onRecord, onStop, onFile, onReset }: RecorderActionsProps) {
  const { recorder } = presenterContent;
  return (
    <div className="recorder-actions">
      {status === 'recording' ? (
        <button type="button" className="button button-primary" onClick={onStop}>
          {recorder.stop}
        </button>
      ) : (
        <button type="button" className="button button-primary" disabled={status !== 'idle'} onClick={onRecord}>
          {recorder.record}
        </button>
      )}
      <label className="button recorder-upload">
        {recorder.upload}
        <input type="file" accept="audio/*" disabled={status !== 'idle'} onChange={onFile} />
      </label>
      <button type="button" className="button" onClick={onReset}>
        {recorder.reset}
      </button>
    </div>
  );
}

function RecorderMessages({ status, message }: { status: Status; message: Message | null }) {
  const { recorder } = presenterContent;
  return (
    <>
      {status === 'recording' ? <p role="status">{recorder.recording(MAX_CLIP_SECONDS)}</p> : null}
      {status === 'processing' ? <p role="status">{recorder.processing}</p> : null}
      {message ? <p role={message.tone === 'error' ? 'alert' : 'status'}>{message.text}</p> : null}
    </>
  );
}

export function RecorderPanel() {
  const { recorder } = presenterContent;
  const { sourceLabel, resetClip } = useClip();
  const { status, message, beginRecording, finishRecording, handleFile } = useRecorder();

  return (
    <section className="card recorder" aria-label={recorder.title}>
      <div className="card-header">
        <h2 className="card-title">{recorder.title}</h2>
      </div>
      <p className="recorder-hint">{recorder.hint}</p>
      <p className="recorder-source">{recorder.currentSource(sourceLabel)}</p>
      <RecorderActions
        status={status}
        onRecord={() => void beginRecording()}
        onStop={() => void finishRecording()}
        onFile={(event) => void handleFile(event)}
        onReset={resetClip}
      />
      <RecorderMessages status={status} message={message} />
    </section>
  );
}
