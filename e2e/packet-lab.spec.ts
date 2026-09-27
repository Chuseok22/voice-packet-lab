import { expect, test } from '@playwright/test';

test.describe('패킷 랩', () => {
  test('첫 화면에 사용 순서와 패킷 손실 프리셋이 보인다', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: 'Voice Packet Lab' })).toBeVisible();
    await expect(page.getByRole('button', { name: '패킷 손실', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: /^패킷 \d+번, 손실$/ }).first()).toBeVisible();
    await expect(page.getByText(/실제 Discord 음성 패킷을 송수신하지 않으며/)).toBeVisible();
  });

  test('시나리오를 바꾸면 지표와 URL이 바뀐다', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('heading', { level: 1, name: 'Voice Packet Lab' }).waitFor();

    await page.getByRole('button', { name: '정상', exact: true }).click();
    await expect(page.locator('.metric', { hasText: 'Packet Loss' })).toContainText('0.0%');

    await page.getByRole('button', { name: '지터 + 버퍼', exact: true }).click();
    await expect(page.locator('.metric', { hasText: '평균 지연' })).toContainText('260 ms');
    await expect(page.locator('.metric', { hasText: '지각 폐기' })).toContainText('0');
    await expect(page).toHaveURL(/jitter=150/);
    await expect(page).toHaveURL(/buffer=160/);
  });

  test('URL 쿼리로 같은 설정을 재현한다', async ({ page }) => {
    await page.goto('/?loss=0&delay=100&jitter=150&buffer=160&seed=1');
    await expect(page.getByRole('button', { name: '지터 + 버퍼', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.metric', { hasText: '평균 지연' })).toContainText('260 ms');
  });

  test('이상한 URL 값은 안전하게 복구한다', async ({ page }) => {
    await page.goto('/?loss=abc&delay=99999&jitter=-5&buffer=-1&seed=1e10');
    await expect(page.getByRole('heading', { level: 1, name: 'Voice Packet Lab' })).toBeVisible();
    await expect(page.getByLabel('Delay')).toHaveValue('500');
    await expect(page.getByLabel('Jitter Buffer')).toHaveAttribute('aria-valuetext', 'OFF');
  });

  test('패킷을 누르면 RTP 정보가 나온다', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /^패킷 \d+번, 정상 도착$/ }).first().click();
    const detail = page.getByRole('region', { name: /^RTP Packet #\d+$/ });
    await expect(detail).toBeVisible();
    await expect(detail).toContainText('Sequence Number');
    await expect(detail).toContainText('3192048');
  });

  test('재생과 정지가 토글되고 설정을 바꾸면 재생이 멈춘다', async ({ page }) => {
    await page.goto('/');
    const play = page.getByRole('button', { name: /현재 설정으로 듣기/ });
    await play.click();
    await expect(page.getByRole('button', { name: /정지/ }).first()).toHaveAttribute('aria-pressed', 'true');

    const slidersToggle = page.getByText('슬라이더로 직접 조절하기');
    if (await slidersToggle.isVisible()) {
      await slidersToggle.click();
    }
    await page.getByLabel('Packet Loss').press('ArrowRight');
    await expect(page.getByRole('button', { name: /현재 설정으로 듣기/ })).toHaveAttribute('aria-pressed', 'false');

    await page.getByRole('button', { name: /현재 설정으로 듣기/ }).click();
    await page.getByRole('button', { name: /정상 음성 듣기/ }).click();
    await expect(page.getByRole('button', { name: /정지/ })).toHaveCount(1);
  });
});
