import { Route, Routes } from 'react-router-dom';
import { PacketLabPage } from '../features/packet-lab/PacketLabPage';
import { PresenterPage } from '../features/presenter/PresenterPage';
import { AppLayout } from './AppLayout';
import { NotFoundPage } from './NotFoundPage';

export function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<PacketLabPage />} />
        <Route path="presenter" element={<PresenterPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
