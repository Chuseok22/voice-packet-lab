import { presenterContent } from '../../content/presenter';

export class RecordingError extends Error {}

export interface RecordingSession {
  stop(): Promise<ArrayBuffer>;
}

function toRecordingError(error: unknown): RecordingError {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError' || error.name === 'SecurityError') {
      return new RecordingError(presenterContent.errors.micDenied);
    }
    if (error.name === 'NotFoundError') {
      return new RecordingError(presenterContent.errors.micMissing);
    }
  }
  return new RecordingError(presenterContent.errors.micFailed);
}

function stopTracks(stream: MediaStream): void {
  stream.getTracks().forEach((track) => track.stop());
}

function beginRecorder(stream: MediaStream): MediaRecorder {
  try {
    const recorder = new MediaRecorder(stream);
    recorder.start();
    return recorder;
  } catch (error) {
    stopTracks(stream);
    throw toRecordingError(error);
  }
}

function collectRecording(recorder: MediaRecorder, stream: MediaStream, onFailed: () => void): Promise<ArrayBuffer> {
  const chunks: Blob[] = [];
  recorder.addEventListener('dataavailable', (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  });

  return new Promise<ArrayBuffer>((resolve, reject) => {
    recorder.addEventListener('stop', () => {
      stopTracks(stream);
      new Blob(chunks, { type: recorder.mimeType }).arrayBuffer().then(resolve, reject);
    });
    recorder.addEventListener('error', () => {
      stopTracks(stream);
      onFailed();
      reject(new RecordingError(presenterContent.errors.micFailed));
    });
  });
}

export async function startRecording(maxSeconds: number, onAutoStop: () => void): Promise<RecordingSession> {
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
    throw new RecordingError(presenterContent.errors.micUnsupported);
  }

  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (error) {
    throw toRecordingError(error);
  }

  const recorder = beginRecorder(stream);
  let timer: number | undefined;
  const finished = collectRecording(recorder, stream, () => window.clearTimeout(timer));
  timer = window.setTimeout(() => {
    if (recorder.state === 'recording') {
      recorder.stop();
      onAutoStop();
    }
  }, maxSeconds * 1000);

  return {
    stop: () => {
      window.clearTimeout(timer);
      if (recorder.state === 'recording') recorder.stop();
      return finished;
    },
  };
}
