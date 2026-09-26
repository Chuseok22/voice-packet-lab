import { PacketLabPage } from '../packet-lab/PacketLabPage';
import { PRESENTER_PASSWORD, verifyPresenterPassword } from './presenterPassword';
import { PasswordGate } from './PasswordGate';
import { RecorderPanel } from './RecorderPanel';

export function PresenterPage() {
  return (
    <PasswordGate
      configured={PRESENTER_PASSWORD !== ''}
      verify={async (input) => verifyPresenterPassword(input, PRESENTER_PASSWORD)}
    >
      <PacketLabPage presenterPanel={<RecorderPanel />} />
    </PasswordGate>
  );
}
