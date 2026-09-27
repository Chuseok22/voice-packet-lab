import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { StepStatus } from './connectionMachine';
import { MessageLog } from './MessageLog';
import { RequestResponsePanel } from './RequestResponsePanel';
import { StepTimeline } from './StepTimeline';

describe('RequestResponsePanel', () => {
  it('asks the user to connect first when there is no handshake', () => {
    render(<RequestResponsePanel handshake={null} />);
    expect(screen.getByText('연결하면 여기에 표시됩니다.')).toBeInTheDocument();
  });

  it('shows both raw texts line by line and explains a line on click', async () => {
    render(
      <RequestResponsePanel
        handshake={{
          request: 'GET /ws/voice-gateway?v=8 HTTP/1.1\nUpgrade: websocket\nSec-WebSocket-Key: abc',
          response: 'HTTP/1.1 101 Switching Protocols\nSec-WebSocket-Accept: xyz',
        }}
      />,
    );
    expect(screen.getByRole('button', { name: 'HTTP/1.1 101 Switching Protocols' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Sec-WebSocket-Key: abc' }));
    expect(screen.getByRole('status')).toHaveTextContent('임의의 값');
    await userEvent.click(screen.getByRole('button', { name: 'HTTP/1.1 101 Switching Protocols' }));
    expect(screen.getByRole('status')).toHaveTextContent('프로토콜을 바꿨다');
  });

  it('keeps a long header value intact in the accessible name instead of truncating it', () => {
    const longKey = 'Sec-WebSocket-Key: aVeryLongBase64EncodedKeyValueThatWouldOtherwiseOverflow==';
    render(
      <RequestResponsePanel
        handshake={{
          request: `GET /ws/voice-gateway?v=8 HTTP/1.1\n${longKey}`,
          response: 'HTTP/1.1 101 Switching Protocols',
        }}
      />,
    );
    expect(screen.getByRole('button', { name: longKey })).toBeInTheDocument();
  });
});

describe('MessageLog', () => {
  it('shows an empty message and then entries with direction and body', () => {
    const { rerender } = render(<MessageLog entries={[]} />);
    expect(screen.getByText('아직 주고받은 메시지가 없습니다.')).toBeInTheDocument();

    rerender(
      <MessageLog
        entries={[
          { id: 1, direction: 'received', name: 'Hello', body: '{"op":8}' },
          { id: 2, direction: 'sent', name: 'Identify', body: '{"op":0}' },
        ]}
      />,
    );
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('받음')).toBeInTheDocument();
    expect(screen.getByText('보냄')).toBeInTheDocument();
    expect(screen.getByText('{"op":0}')).toBeInTheDocument();
  });
});

describe('StepTimeline', () => {
  it('renders ten steps with badges and marks the active one', () => {
    const statuses: StepStatus[] = ['done', 'done', 'active', ...Array<StepStatus>(7).fill('pending')];
    render(<StepTimeline statuses={statuses} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(10);
    expect(screen.getByText('TCP 3-way handshake').closest('li')).toHaveClass('step-done');
    expect(screen.getByText('HTTP 업그레이드 요청').closest('li')).toHaveAttribute('aria-current', 'step');
    expect(screen.getAllByText('설명 전용').length).toBeGreaterThan(0);
    expect(screen.getAllByText('응용 계층').length).toBeGreaterThan(0);
  });
});
