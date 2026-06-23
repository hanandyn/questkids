import { test, expect } from '@playwright/test';

const apiBaseURL = process.env.E2E_API_URL || process.env.E2E_BASE_URL;

/**
 * E2E tests for tasks and quest board.
 */

test.describe('Tasks', () => {
  test('should show login page before accessing tasks', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /fundo/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /kid/i })).toBeVisible();
  });

  test('should load API health endpoint successfully', async ({ request }) => {
    test.skip(!apiBaseURL, 'Set E2E_API_URL to run backend API checks.');
    const response = await request.get(`${apiBaseURL}/api/v1/health`);
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.status).toBeDefined();
  });

  test('should return proper CORS headers', async ({ request }) => {
    test.skip(!apiBaseURL, 'Set E2E_API_URL to run backend API checks.');
    const response = await request.get(`${apiBaseURL}/api/v1/health`, {
      headers: { 'Origin': 'https://fundo.dayan.casa' },
    });
    // CORS headers should be present
    const headers = response.headers();
    expect(headers).toHaveProperty('access-control-allow-origin');
  });

  test('should handle 404 for non-existent task', async ({ request }) => {
    test.skip(!apiBaseURL, 'Set E2E_API_URL to run backend API checks.');
    const response = await request.get(`${apiBaseURL}/api/v1/tasks/instances/999999`);
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });
});
