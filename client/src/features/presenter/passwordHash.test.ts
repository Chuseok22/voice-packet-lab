// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { sha256Hex, verifyPresenterPassword } from './passwordHash';

const ABC_HASH = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';

describe('sha256Hex', () => {
  it('matches the known SHA-256 vector', async () => {
    expect(await sha256Hex('abc')).toBe(ABC_HASH);
  });
});

describe('verifyPresenterPassword', () => {
  it('accepts the right password, ignoring hash case and surrounding whitespace', async () => {
    expect(await verifyPresenterPassword('abc', ABC_HASH)).toBe(true);
    expect(await verifyPresenterPassword('abc', ` ${ABC_HASH.toUpperCase()} `)).toBe(true);
  });

  it('rejects a wrong password', async () => {
    expect(await verifyPresenterPassword('abd', ABC_HASH)).toBe(false);
  });

  it('fails closed when no hash is configured', async () => {
    expect(await verifyPresenterPassword('abc', '')).toBe(false);
    expect(await verifyPresenterPassword('', '')).toBe(false);
  });
});
