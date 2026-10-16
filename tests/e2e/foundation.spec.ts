import { expect, test } from '@playwright/test';

test('foundation renders styled UI, supports keyboard activation and remains usable on mobile', async ({
  page,
}) => {
  const browserErrors: string[] = [];
  page.on('pageerror', (error) => browserErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push(message.text());
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '基础工程已就绪' })).toBeVisible();
  const button = page.getByRole('button', { name: '验证交互' });
  // AI modified: flex items blockify inline-flex, so check alignment instead of the authored display value.
  await expect(button).toHaveCSS('align-items', 'center');
  await expect(button).toHaveCSS('border-radius', /[1-9]/);
  await button.click();
  await expect(page.getByRole('status')).toHaveText('已响应 1 次');
  await button.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('status')).toHaveText('已响应 2 次');
  await page.setViewportSize({ width: 375, height: 812 });
  await expect(button).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  expect(browserErrors).toEqual([]);
});
