import { test, expect } from '@playwright/test';

const viewports = [
  { name: 'small-phone', width: 320, height: 568 },
  { name: 'phone', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'wide', width: 1920, height: 1080 },
];

test.describe('Responsive layout', () => {
  for (const viewport of viewports) {
    test(`login shell fits ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/');
      await expect(page.locator('body')).toBeVisible();

      const overflow = await page.evaluate(() => {
        const doc = document.documentElement;
        return {
          horizontal: doc.scrollWidth - doc.clientWidth,
          vertical: doc.scrollHeight,
          viewport: doc.clientHeight,
        };
      });

      expect(overflow.horizontal).toBeLessThanOrEqual(2);
      expect(overflow.vertical).toBeGreaterThan(0);
    });
  }
});
