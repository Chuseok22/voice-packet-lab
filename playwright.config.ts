import { defineConfig, devices } from '@playwright/test';
import { E2E_PORT, E2E_PRESENTER_PASSWORD } from './e2e/constants';

const fakeMicrophone = {
  args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
};

export default defineConfig({
  testDir: 'e2e',
  reporter: 'list',
  use: { baseURL: `http://127.0.0.1:${E2E_PORT}` },
  webServer: {
    // 이미 떠 있는 서버를 재사용하면 발표자 비밀번호가 다르게 빌드되어 있을 수 있으므로 항상 새로 띄운다. 서버 포트는 3000으로 고정이라 E2E 전에 개발 서버를 꺼 둔다.
    command: 'pnpm build && pnpm start',
    url: `http://127.0.0.1:${E2E_PORT}/healthz`,
    reuseExistingServer: false,
    timeout: 180_000,
    env: { VITE_PRESENTER_PASSWORD: E2E_PRESENTER_PASSWORD },
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
