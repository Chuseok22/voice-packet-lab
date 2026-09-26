import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PasswordGate } from './PasswordGate';

function renderGate(verify: (input: string) => Promise<boolean>, configured = true) {
  return render(
    <PasswordGate configured={configured} verify={verify}>
      <p>발표자 화면</p>
    </PasswordGate>,
  );
}

describe('PasswordGate', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('keeps the content hidden and shows an error for a wrong password', async () => {
    renderGate(vi.fn().mockResolvedValue(false));
    await userEvent.type(screen.getByLabelText('비밀번호'), 'nope');
    await userEvent.click(screen.getByRole('button', { name: '확인' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('비밀번호가 맞지 않습니다');
    expect(screen.queryByText('발표자 화면')).not.toBeInTheDocument();
  });

  it('unlocks with the right password and remembers it for the session', async () => {
    const verify = vi.fn().mockResolvedValue(true);
    const { unmount } = renderGate(verify);
    await userEvent.type(screen.getByLabelText('비밀번호'), 'secret');
    await userEvent.click(screen.getByRole('button', { name: '확인' }));
    expect(await screen.findByText('발표자 화면')).toBeInTheDocument();
    expect(verify).toHaveBeenCalledWith('secret');

    unmount();
    renderGate(verify);
    expect(screen.getByText('발표자 화면')).toBeInTheDocument();
  });

  it('shows a configuration message and no form when no password is configured', () => {
    renderGate(vi.fn(), false);
    expect(screen.getByRole('alert')).toHaveTextContent('설정되지 않았습니다');
    expect(screen.queryByLabelText('비밀번호')).not.toBeInTheDocument();
  });

  it('explains when hashing is unavailable', async () => {
    renderGate(vi.fn().mockRejectedValue(new Error('no crypto')));
    await userEvent.type(screen.getByLabelText('비밀번호'), 'x');
    await userEvent.click(screen.getByRole('button', { name: '확인' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('HTTPS');
  });
});
