import { test, expect } from '@playwright/test';

test('landing page loads and renders', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Squares/);
  await expect(page.getByRole('heading', { level: 1, name: 'Squares' })).toBeVisible();
});
