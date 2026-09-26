import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Opcode, type ReadyMessage } from '@voice-packet-lab/shared';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConnectionPage } from './ConnectionPage';
import { connectGateway, type GatewayHandlers } from './gatewayClient';
import { snapshotData } from './snapshotData';

vi.mock('./gatewayClient', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./gatewayClient')>()),
  connectGateway: vi.fn(),
}));

const HELLO = { op: Opcode.Hello, d: { heartbeat_interval: 5000 } } as const;
const READY: ReadyMessage = { op: Opcode.Ready, d: { ssrc: 1, ip: '203.0.113.10', port: 50000, modes: ['a'] } };

let handlers: GatewayHandlers;
const sendIdentify = vi.fn();
const close = vi.fn();

function renderPage() {
  return render(
    <MemoryRouter>
      <ConnectionPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  sendIdentify.mockReset();
  close.mockReset();
  vi.mocked(connectGateway).mockReset();
  vi.mocked(connectGateway).mockImplementation((captured) => {
    handlers = captured;
    return { sendIdentify, close };
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('ConnectionPage', () => {
  it('always shows the mock-server notice and starts idle', () => {
    renderPage();
    expect(screen.getByText(/학습용 mock 서버/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '연결하기' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Identify 보내기' })).toBeDisabled();
  });

  it('walks through a live connection', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: '연결하기' }));
    expect(screen.getByRole('button', { name: '연결하기' })).toBeDisabled();

    act(() => handlers.onHandshake('GET /ws/voice-gateway?v=8 HTTP/1.1\nUpgrade: websocket', 'HTTP/1.1 101 Switching Protocols'));
    expect(screen.getByRole('button', { name: 'HTTP/1.1 101 Switching Protocols' })).toBeInTheDocument();

    act(() => handlers.onMessage(HELLO));
    const identify = screen.getByRole('button', { name: 'Identify 보내기' });
    expect(identify).toBeEnabled();
    await userEvent.click(identify);
    expect(sendIdentify).toHaveBeenCalledTimes(1);

    act(() => {
      handlers.onSent({ op: Opcode.Identify, d: { server_id: '1', user_id: '2', session_id: 's', token: 't' } });
      handlers.onMessage(READY);
      handlers.onHeartbeatAck(37);
    });
    expect(screen.getByText('실제 서버와 연결되었습니다.')).toBeInTheDocument();
    expect(screen.getByText(/마지막 RTT 37ms/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '패킷 랩으로 이동' })).toHaveAttribute('href', '/');
  });

  it('falls back to the recorded snapshot when the server cannot be reached', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderPage();
    await user.click(screen.getByRole('button', { name: '연결하기' }));
    act(() => handlers.onFailure('서버에 연결하지 못했습니다.', false));

    expect(screen.getByText(/예시 \(서버 미연결\)/)).toBeInTheDocument();
    expect(screen.getByText(snapshotData.request.split('\n')[0])).toBeInTheDocument();
    const identify = screen.getByRole('button', { name: 'Identify 보내기' });
    expect(identify).toBeEnabled();

    await user.click(identify);
    await user.click(identify);
    await act(() => vi.advanceTimersByTimeAsync(1500));
    expect(screen.getAllByText('Ready').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Identify')).toHaveLength(1);
    expect(screen.getByRole('link', { name: '패킷 랩으로 이동' })).toBeInTheDocument();
  });

  it('shows an error when the connection drops after the handshake', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: '연결하기' }));
    act(() => handlers.onHandshake('GET /', 'HTTP/1.1 101 Switching Protocols'));
    act(() => handlers.onFailure('서버와의 연결이 끊어졌습니다.', true));
    expect(screen.getByRole('alert')).toHaveTextContent('서버와의 연결이 끊어졌습니다.');
    expect(screen.getByRole('button', { name: '다시 연결하기' })).toBeEnabled();
  });

  it('closes the previous connection when reconnecting and on unmount', async () => {
    const { unmount } = renderPage();
    await userEvent.click(screen.getByRole('button', { name: '연결하기' }));
    act(() => handlers.onHandshake('GET /', 'HTTP/1.1 101 Switching Protocols'));
    act(() => handlers.onMessage(HELLO));

    await userEvent.click(screen.getByRole('button', { name: '다시 연결하기' }));
    expect(close).toHaveBeenCalledTimes(1);
    expect(connectGateway).toHaveBeenCalledTimes(2);

    unmount();
    expect(close).toHaveBeenCalledTimes(2);
  });
});
