import { expect, test } from '@playwright/test';
import { E2E_PRESENTER_PASSWORD } from './constants';

test.describe('발표자 모드', () => {
  test('틀린 비밀번호는 거부하고 맞는 비밀번호는 녹음 패널을 연다', async ({ page }) => {
    await page.goto('/presenter');
    await page.getByLabel('비밀번호').fill('wrong-password');
    await page.getByRole('button', { name: '확인' }).click();
    await expect(page.getByRole('alert')).toContainText('비밀번호가 맞지 않습니다');
    await expect(page.getByText('내 목소리로 실습하기')).toHaveCount(0);

    await page.getByLabel('비밀번호').fill(E2E_PRESENTER_PASSWORD);
    await page.getByRole('button', { name: '확인' }).click();
    await expect(page.getByRole('heading', { name: '내 목소리로 실습하기' })).toBeVisible();
    await expect(page.getByText('현재 음원: 기본 음원')).toBeVisible();
  });

  test('가짜 마이크로 녹음하면 음원이 내 녹음으로 바뀌고 되돌릴 수 있다', async ({ page }) => {
    await page.goto('/presenter');
    await page.getByLabel('비밀번호').fill(E2E_PRESENTER_PASSWORD);
    await page.getByRole('button', { name: '확인' }).click();

    await page.getByRole('button', { name: '● 녹음 시작' }).click();
    await expect(page.getByText(/녹음 중/)).toBeVisible();
    await page.waitForTimeout(1500);
    await page.getByRole('button', { name: '■ 녹음 끝내기' }).click();
    await expect(page.getByText('현재 음원: 내 녹음')).toBeVisible();

    await page.getByRole('button', { name: '기본 음원으로 되돌리기' }).click();
    await expect(page.getByText('현재 음원: 기본 음원')).toBeVisible();
  });

  test('일반 접속자에게는 발표자 기능이 보이지 않는다', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: '컴퓨터네트워크 2조 - 음성 패킷 실습' })).toBeVisible();
    await expect(page.getByText('내 목소리로 실습하기')).toHaveCount(0);
    await expect(page.getByRole('link', { name: /발표자/ })).toHaveCount(0);
  });
});
