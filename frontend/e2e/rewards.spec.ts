import { test, expect } from '@playwright/test';

const apiBaseURL = process.env.E2E_API_URL || process.env.E2E_BASE_URL;

/**
 * E2E tests for rewards shop.
 */

test.describe('Rewards', () => {
  test('should require authentication for rewards API', async ({ request }) => {
    test.skip(!apiBaseURL, 'Set E2E_API_URL to run backend API checks.');
    const response = await request.get(`${apiBaseURL}/api/v1/rewards/list`);
    // Should be 401 or 403 (auth required)
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('should return proper error for unauthenticated redemptions', async ({ request }) => {
    test.skip(!apiBaseURL, 'Set E2E_API_URL to run backend API checks.');
    const response = await request.post(`${apiBaseURL}/api/v1/rewards/redeem`, {
      data: { reward_id: 1 },
    });
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('should get health endpoint version', async ({ request }) => {
    test.skip(!apiBaseURL, 'Set E2E_API_URL to run backend API checks.');
    const response = await request.get(`${apiBaseURL}/api/v1/health`);
    const data = await response.json();
    expect(data.version).toBe('1.0.1');
  });
});
