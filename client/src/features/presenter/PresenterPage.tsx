import { PacketLabPage } from '../packet-lab/PacketLabPage';
import { PRESENTER_PASSWORD_HASH, verifyPresenterPassword } from './passwordHash';
import { PasswordGate } from './PasswordGate';
import { RecorderPanel } from './RecorderPanel';

export function PresenterPage() {
  return (
    <PasswordGate
      configured={PRESENTER_PASSWORD_HASH !== ''}
      verify={(input) => verifyPresenterPassword(input, PRESENTER_PASSWORD_HASH)}
    >
      <PacketLabPage presenterPanel={<RecorderPanel />} />
    </PasswordGate>
  );
}
