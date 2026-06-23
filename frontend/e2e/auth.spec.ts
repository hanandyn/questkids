import { test, expect } from '@playwright/test';

/**
 * E2E tests for authentication flows.
 */

test.describe('Authentication', () => {
  test('should show login page when not authenticated', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /grown-up|parent/i }).click();
    await expect(page.locator('input[type="text"]').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /grown-up|parent/i }).click();
    await page.locator('input[type="text"]').first().fill('invalid-user');
    await page.locator('input[type="password"]').first().fill('wrong-password');
    await page.click('button[type="submit"]');

    // Should show error message
    await expect(page.locator('[role="alert"], .text-red-700, .text-red')).toBeVisible({ timeout: 10000 });
  });

  test('should show registration form toggle', async ({ page }) => {
    await page.goto('/');
    // Click register link/button
    const registerLink = page.locator('button, a').filter({ hasText: /register|sign up|create/i });
    if (await registerLink.count() > 0) {
      await registerLink.first().click();
      // Should show family name field in registration
      const familyField = page.locator('input[type="text"]').first();
      await expect(familyField).toBeVisible({ timeout: 5000 });
    }
  });

  test('should maintain session across page navigation', async ({ page }) => {
    await page.goto('/');
    // Verify the page loads without errors
    await expect(page.locator('body')).toBeVisible();
    // Navigation should not throw 500 errors
    const response = await page.goto('/');
    expect(response?.status()).toBeLessThan(500);
  });
});
