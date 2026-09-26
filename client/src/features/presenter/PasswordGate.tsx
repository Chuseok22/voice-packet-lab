import { useState, type FormEvent, type ReactNode } from 'react';
import { presenterContent } from '../../content/presenter';
import './presenter.css';

const STORAGE_KEY = 'presenter-unlocked';

function readUnlocked(): boolean {
  try {
    return window.sessionStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function rememberUnlocked(): void {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, 'true');
  } catch {
    // 저장에 실패해도 새로고침 후 비밀번호를 다시 입력하면 되므로 진행을 막지 않는다.
  }
}

interface PasswordGateProps {
  configured: boolean;
  verify: (input: string) => Promise<boolean>;
  children: ReactNode;
}

function NotConfiguredNotice() {
  const { gate } = presenterContent;
  return (
    <section className="card gate">
      <h1>{gate.title}</h1>
      <p role="alert">{gate.notConfigured}</p>
    </section>
  );
}

interface PasswordFormProps {
  verify: (input: string) => Promise<boolean>;
  onUnlock: () => void;
}

function PasswordForm({ verify, onUnlock }: PasswordFormProps) {
  const { gate } = presenterContent;
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setChecking(true);
    setError(null);
    try {
      if (await verify(password)) {
        rememberUnlocked();
        onUnlock();
      } else {
        setError(gate.wrong);
      }
    } catch {
      setError(gate.unavailable);
    } finally {
      setChecking(false);
    }
  };

  return (
    <section className="card gate">
      <h1>{gate.title}</h1>
      <p>{gate.description}</p>
      <form onSubmit={submit}>
        <label htmlFor="presenter-password">{gate.label}</label>
        <input
          id="presenter-password"
          type="password"
          autoComplete="off"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <button type="submit" className="button button-primary" disabled={checking}>
          {gate.submit}
        </button>
      </form>
      {error ? <p role="alert">{error}</p> : null}
    </section>
  );
}

export function PasswordGate({ configured, verify, children }: PasswordGateProps) {
  const [unlocked, setUnlocked] = useState(readUnlocked);

  if (unlocked) {
    return <>{children}</>;
  }
  if (!configured) {
    return <NotConfiguredNotice />;
  }
  return <PasswordForm verify={verify} onUnlock={() => setUnlocked(true)} />;
}
