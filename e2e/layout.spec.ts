import { expect, test } from '@playwright/test';

// Real-viewport checks that unit tests can't do. Widths are the documented breakpoints (DSR2P-3 / 40).
for (const [width, topNav, bottomBar] of [
  [375, 0, 1],
  [639, 0, 1],
  [640, 1, 0],
  [1024, 1, 0],
] as const) {
  test(`${String(width)}px shows exactly one navigation`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/');
    await expect(page.locator('app-top-nav')).toHaveCount(topNav);
    await expect(page.locator('app-bottom-tab-bar')).toHaveCount(bottomBar);
    await expect(page.getByLabel('City')).toHaveCount(1); // the selector is in whichever header is shown
    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(overflows).toBe(false);
  });
}

test('nav swaps live when the window crosses 640px', async ({ page }) => {
  await page.setViewportSize({ width: 639, height: 800 });
  await page.goto('/');
  await expect(page.locator('app-bottom-tab-bar')).toHaveCount(1);
  await page.setViewportSize({ width: 640, height: 800 });
  await expect(page.locator('app-top-nav')).toHaveCount(1);
  await expect(page.locator('app-bottom-tab-bar')).toHaveCount(0);
});
