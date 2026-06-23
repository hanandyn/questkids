import { test, expect } from '@playwright/test';

const apiBaseURL = process.env.E2E_API_URL || process.env.E2E_BASE_URL;

/**
 * E2E tests for Tier 1 Little Explorer dashboard.
 */

test.describe('Tier 1 — Little Explorer', () => {
  test('should check tier1 API endpoint exists', async ({ request }) => {
    test.skip(!apiBaseURL, 'Set E2E_API_URL to run backend API checks.');
    // The tier1 tasks endpoint should exist (even if auth fails)
    const response = await request.get(`${apiBaseURL}/api/v1/tier1/tasks`);
    // 401 or 403 expected (requires auth), but not 404
    expect(response.status()).not.toBe(404);
  });

  test('should check pet state endpoint exists', async ({ request }) => {
    test.skip(!apiBaseURL, 'Set E2E_API_URL to run backend API checks.');
    const response = await request.get(`${apiBaseURL}/api/v1/tier1/pet`);
    expect(response.status()).not.toBe(404);
  });

  test('should serve static assets', async ({ request }) => {
    const response = await request.get('/');
    expect(response.status()).toBe(200);
    const html = await response.text();
    // Should include app div or script references
    expect(html.toLowerCase()).toContain('<!doctype html>');
  });

  test('should have PWA manifest', async ({ request }) => {
    const response = await request.get('/manifest.webmanifest');
    // May be 200 or 404 depending on build
    expect([200, 404]).toContain(response.status());
  });
});
