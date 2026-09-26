import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ClipProvider } from '../packet-lab/ClipProvider';
import { RecorderPanel } from './RecorderPanel';
import { RecordingError, startRecording, type RecordingSession } from './recordClip';

const decodeAudioFile = vi.fn();
vi.mock('../../audio/clip', () => ({
  loadBundledSample: () => Promise.resolve(new Float32Array(960 * 3)),
  decodeAudioFile: (data: ArrayBuffer) => decodeAudioFile(data),
}));

vi.mock('./recordClip', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./recordClip')>()),
  startRecording: vi.fn(),
}));

function renderPanel() {
  return render(
    <ClipProvider>
      <RecorderPanel />
    </ClipProvider>,
  );
}

function audioFile(): File {
  const file = new File(['x'], 'clip.wav', { type: 'audio/wav' });
  Object.defineProperty(file, 'arrayBuffer', { value: () => Promise.resolve(new ArrayBuffer(8)) });
  return file;
}

describe('RecorderPanel', () => {
  beforeEach(() => {
    decodeAudioFile.mockReset();
    vi.mocked(startRecording).mockReset();
  });

  it('shows the current source and applies an uploaded file', async () => {
    decodeAudioFile.mockResolvedValue({ samples: new Float32Array(960 * 4), truncated: false });
    renderPanel();
    expect(screen.getByText(/현재 음원: 기본 음원/)).toBeInTheDocument();

    await userEvent.upload(screen.getByLabelText('파일 업로드'), audioFile());
    await waitFor(() => expect(screen.getByText(/현재 음원: 업로드한 파일/)).toBeInTheDocument());
  });

  it('tells the presenter when the clip was truncated', async () => {
    decodeAudioFile.mockResolvedValue({ samples: new Float32Array(960 * 4), truncated: true });
    renderPanel();
    await userEvent.upload(screen.getByLabelText('파일 업로드'), audioFile());
    expect(await screen.findByText(/잘랐습니다/)).toBeInTheDocument();
  });

  it('rejects a clip that is too short and keeps the current source', async () => {
    decodeAudioFile.mockResolvedValue({ samples: new Float32Array(10), truncated: false });
    renderPanel();
    await userEvent.upload(screen.getByLabelText('파일 업로드'), audioFile());
    expect(await screen.findByRole('alert')).toHaveTextContent('너무 짧습니다');
    expect(screen.getByText(/현재 음원: 기본 음원/)).toBeInTheDocument();
  });

  it('shows a decode failure and can restore the default clip', async () => {
    decodeAudioFile.mockRejectedValueOnce(new Error('bad audio'));
    renderPanel();
    await userEvent.upload(screen.getByLabelText('파일 업로드'), audioFile());
    expect(await screen.findByRole('alert')).toHaveTextContent('읽을 수 없습니다');

    decodeAudioFile.mockResolvedValue({ samples: new Float32Array(960 * 4), truncated: false });
    await userEvent.upload(screen.getByLabelText('파일 업로드'), audioFile());
    await waitFor(() => expect(screen.getByText(/업로드한 파일/)).toBeInTheDocument());

    await userEvent.click(screen.getByRole('button', { name: '기본 음원으로 되돌리기' }));
    expect(screen.getByText(/현재 음원: 기본 음원/)).toBeInTheDocument();
  });

  it('shows the decode error when the file cannot be read', async () => {
    renderPanel();
    const file = new File(['x'], 'clip.wav', { type: 'audio/wav' });
    Object.defineProperty(file, 'arrayBuffer', { value: () => Promise.reject(new Error('read failed')) });
    await userEvent.upload(screen.getByLabelText('파일 업로드'), file);
    expect(await screen.findByRole('alert')).toHaveTextContent('읽을 수 없습니다');
    expect(decodeAudioFile).not.toHaveBeenCalled();
  });

  it('stops the microphone when the panel unmounts before recording has started', async () => {
    let resolveStart: (session: RecordingSession) => void = () => undefined;
    vi.mocked(startRecording).mockReturnValue(new Promise<RecordingSession>((resolve) => (resolveStart = resolve)));
    const { unmount } = renderPanel();
    await userEvent.click(screen.getByRole('button', { name: '● 녹음 시작' }));
    unmount();

    const stop = vi.fn(() => Promise.resolve(new ArrayBuffer(8)));
    resolveStart({ stop });
    await waitFor(() => expect(stop).toHaveBeenCalledTimes(1));
  });

  it('starts only one recording on a double click and shows the recording state', async () => {
    let resolveStart: (session: RecordingSession) => void = () => undefined;
    vi.mocked(startRecording).mockReturnValue(new Promise<RecordingSession>((resolve) => (resolveStart = resolve)));
    renderPanel();
    const recordButton = screen.getByRole('button', { name: '● 녹음 시작' });

    await userEvent.dblClick(recordButton);
    expect(startRecording).toHaveBeenCalledTimes(1);
    expect(recordButton).toBeDisabled();

    resolveStart({ stop: () => Promise.resolve(new ArrayBuffer(8)) });
    expect(await screen.findByRole('button', { name: '■ 녹음 끝내기' })).toBeInTheDocument();
  });

  it('shows the error and re-enables recording when starting fails', async () => {
    vi.mocked(startRecording).mockRejectedValue(new RecordingError('마이크 거부'));
    renderPanel();
    await userEvent.click(screen.getByRole('button', { name: '● 녹음 시작' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('마이크 거부');
    expect(screen.getByRole('button', { name: '● 녹음 시작' })).toBeEnabled();
  });
});
