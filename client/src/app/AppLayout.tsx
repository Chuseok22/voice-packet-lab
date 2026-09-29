import { NavLink, Outlet } from 'react-router-dom';
import { commonContent } from '../content/common';

export function AppLayout() {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        {commonContent.skipToContent}
      </a>
      <header className="app-header">
        <span className="app-brand">
          <span className="app-brand-full">{commonContent.brand}</span>
          <span className="app-brand-short">{commonContent.brandShort}</span>
        </span>
        <nav className="app-nav" aria-label={commonContent.nav.label}>
          <NavLink to="/" end>
            {commonContent.nav.packetLab}
          </NavLink>
          <NavLink to="/connect">{commonContent.nav.connection}</NavLink>
        </nav>
      </header>
      <main id="main" tabIndex={-1} className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
