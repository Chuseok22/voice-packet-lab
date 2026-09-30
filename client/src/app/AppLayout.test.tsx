import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AppLayout } from './AppLayout';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<p>패킷 랩 본문</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('AppLayout', () => {
  it('shows the navigation and the routed content inside main', () => {
    renderAt('/');
    expect(screen.getByRole('navigation', { name: '주요 메뉴' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '패킷 랩' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('main')).toHaveTextContent('패킷 랩 본문');
  });

  it('does not offer the disabled connection page in the navigation', () => {
    renderAt('/');
    expect(screen.queryByRole('link', { name: '연결 과정' })).not.toBeInTheDocument();
  });

  it('offers a skip link to the main content', () => {
    renderAt('/');
    expect(screen.getByRole('link', { name: '본문으로 건너뛰기' })).toHaveAttribute('href', '#main');
  });
});
