export function verifyPresenterPassword(input: string, expected: string): boolean {
  return expected !== '' && input === expected;
}

export const PRESENTER_PASSWORD: string = import.meta.env.VITE_PRESENTER_PASSWORD ?? '';
