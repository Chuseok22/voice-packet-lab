export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function verifyPresenterPassword(input: string, expectedHash: string): Promise<boolean> {
  const expected = expectedHash.trim().toLowerCase();
  if (expected === '') {
    return false;
  }
  return (await sha256Hex(input)) === expected;
}

export const PRESENTER_PASSWORD_HASH: string = import.meta.env.VITE_PRESENTER_PASSWORD_SHA256 ?? '';
