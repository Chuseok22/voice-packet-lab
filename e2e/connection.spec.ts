import { expect, test } from '@playwright/test';
import { E2E_PORT } from './constants';

test.describe('연결 과정', () => {
  test('실제 서버와 업그레이드하고 Identify를 보내면 Ready를 받는다', async ({ page }) => {
    await page.goto('/connect');
    await page.getByRole('button', { name: '연결하기' }).click();

    await expect(page.getByRole('button', { name: /HTTP\/1\.1 101 Switching Protocols/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Sec-WebSocket-Accept:/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /^GET \/ws\/voice-gateway\?v=8 HTTP\/1\.1$/ })).toBeVisible();
    await expect(page.getByText('실제 서버와 연결되었습니다.')).toBeVisible();

    await page.getByRole('button', { name: 'Identify 보내기' }).click();
    await expect(page.locator('.message', { hasText: 'Ready' })).toBeVisible();
    await expect(page.getByText(/Heartbeat \d+회 · 마지막 RTT/)).toBeVisible();
    await expect(page.getByRole('link', { name: '패킷 랩으로 이동' })).toBeVisible();
  });

  test('요청에 쿠키 같은 민감한 헤더가 나오지 않는다', async ({ page, context }) => {
    await context.addCookies([{ name: 'secret', value: 'do-not-leak', url: `http://127.0.0.1:${E2E_PORT}` }]);
    await page.goto('/connect');
    await page.getByRole('button', { name: '연결하기' }).click();
    await expect(page.getByText('실제 서버와 연결되었습니다.')).toBeVisible();
    await expect(page.locator('.panel')).not.toContainText(/cookie|do-not-leak/i);
  });

  test('서버에 닿지 못하면 예시 스냅샷으로 자동 전환한다', async ({ page }) => {
    await page.routeWebSocket(/voice-gateway/, (route) => {
      void route.close({ code: 1011, reason: 'blocked for test' });
    });
    await page.goto('/connect');
    await page.getByRole('button', { name: '연결하기' }).click();

    await expect(page.getByText(/예시 \(서버 미연결\)/)).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: /HTTP\/1\.1 101 Switching Protocols/ })).toBeVisible();
    await page.getByRole('button', { name: 'Identify 보내기' }).click();
    await expect(page.locator('.message', { hasText: 'Ready' })).toBeVisible({ timeout: 5000 });
  });

  test('연결 버튼을 연달아 눌러도 다시 연결할 수 있다', async ({ page }) => {
    await page.goto('/connect');
    await page.getByRole('button', { name: '연결하기' }).click();
    await expect(page.getByText('실제 서버와 연결되었습니다.')).toBeVisible();
    await page.getByRole('button', { name: '다시 연결하기' }).click();
    await expect(page.getByText('실제 서버와 연결되었습니다.')).toBeVisible();
  });
});
