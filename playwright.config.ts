import { createHash } from 'node:crypto';
import { defineConfig, devices } from '@playwright/test';
import { E2E_PORT, E2E_PRESENTER_PASSWORD } from './e2e/constants';

const presenterHash = createHash('sha256').update(E2E_PRESENTER_PASSWORD).digest('hex');
const fakeMicrophone = {
  args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
};

export default defineConfig({
  testDir: 'e2e',
  reporter: 'list',
  use: { baseURL: `http://127.0.0.1:${E2E_PORT}` },
  webServer: {
    // 이미 떠 있는 서버를 재사용하면 발표자 해시가 다르게 빌드되어 있을 수 있으므로 항상 새로 띄운다.
    command: 'pnpm build && pnpm start',
    url: `http://127.0.0.1:${E2E_PORT}/healthz`,
    reuseExistingServer: false,
    timeout: 180_000,
    env: { PORT: String(E2E_PORT), VITE_PRESENTER_PASSWORD_SHA256: presenterHash },
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], permissions: ['microphone'], launchOptions: fakeMicrophone },
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 7'], permissions: ['microphone'], launchOptions: fakeMicrophone },
    },
  ],
});
