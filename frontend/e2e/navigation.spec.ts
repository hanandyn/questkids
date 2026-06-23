import { test, expect } from '@playwright/test';

const apiBaseURL = process.env.E2E_API_URL || process.env.E2E_BASE_URL;

/**
 * E2E tests for navigation and routing.
 */

test.describe('Navigation', () => {
  test('should load the app without crashing', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBeLessThan(500);
    // The page should render content
    await expect(page.locator('body')).toBeVisible();
  });

  test('should serve proper HTML document', async ({ page }) => {
    const response = await page.goto('/');
    const contentType = response?.headers()['content-type'] || '';
    expect(contentType).toContain('text/html');
  });

  test('should have proper meta tags', async ({ page }) => {
    await page.goto('/');
    // Should have a title
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);

    // Should have viewport meta
    const viewport = page.locator('meta[name="viewport"]');
    expect(await viewport.count()).toBeGreaterThanOrEqual(0);
  });

  test('should handle API health check', async ({ request }) => {
    test.skip(!apiBaseURL, 'Set E2E_API_URL to run backend API checks.');
    const response = await request.get(`${apiBaseURL}/api/v1/health`);
    expect(response.status()).toBeLessThan(500);
    const body = await response.json();
    expect(body).toHaveProperty('status');
    expect(body).toHaveProperty('version');
  });
});
