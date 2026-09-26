import { describe, expect, it } from 'vitest';
import { verifyPresenterPassword } from './presenterPassword';

describe('verifyPresenterPassword', () => {
  it('accepts the exact password', () => {
    expect(verifyPresenterPassword('secret', 'secret')).toBe(true);
  });

  it('rejects a wrong password, including a different case', () => {
    expect(verifyPresenterPassword('secreT', 'secret')).toBe(false);
    expect(verifyPresenterPassword('', 'secret')).toBe(false);
  });

  it('fails closed when no password is configured', () => {
    expect(verifyPresenterPassword('', '')).toBe(false);
    expect(verifyPresenterPassword('anything', '')).toBe(false);
  });
});
