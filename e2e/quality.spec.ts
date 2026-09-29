import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const WIDTHS = [320, 768, 1024, 1440];
const ROUTES = [
  { path: '/', ready: '컴퓨터네트워크 2조 - 음성 패킷 실습', name: 'lab' },
  { path: '/connect', ready: '연결 과정', name: 'connect' },
];

test.describe('반응형', () => {
  for (const route of ROUTES) {
    for (const width of WIDTHS) {
      test(`${route.name} ${width}px 에서 가로 넘침이 없다`, async ({ page }, testInfo) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(route.path);
        await expect(page.getByRole('heading', { level: 1, name: route.ready })).toBeVisible();
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(overflow).toBeLessThanOrEqual(1);
        await page.screenshot({ path: `test-results/screens/${testInfo.project.name}-${route.name}-${width}.png`, fullPage: true });
      });
    }
  }

  test('좁은 화면에서 재생 바가 화면 아래에 고정된다', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 700 });
    await page.goto('/');
    const play = page.getByRole('button', { name: /현재 설정으로 듣기/ });
    await expect(play).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(play).toBeInViewport();
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
    await expect(play).toBeInViewport();
  });
});

test.describe('접근성', () => {
  for (const route of ROUTES) {
    test(`${route.name} 에 심각한 접근성 위반이 없다`, async ({ page }) => {
      await page.goto(route.path);
      await expect(page.getByRole('heading', { level: 1, name: route.ready })).toBeVisible();
      const results = await new AxeBuilder({ page }).analyze();
      const serious = results.violations.filter((violation) => violation.impact === 'critical' || violation.impact === 'serious');
      expect(serious.map((violation) => `${violation.id}: ${violation.nodes.length}`)).toEqual([]);
    });
  }

  test('키보드만으로 패킷을 선택할 수 있다', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /^패킷 \d+번, 정상 도착$/ }).first().focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('region', { name: /^RTP Packet #\d+$/ })).toBeVisible();
  });
});
