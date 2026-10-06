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
    // City selector and search box are in whichever header is shown, selector on the left.
    const [city, search] = [page.getByLabel('City'), page.getByLabel('Search restaurants')];
    await expect(city).toHaveCount(1);
    await expect(search).toHaveCount(1);
    const [cityBox, searchBox] = [await city.boundingBox(), await search.boundingBox()];
    expect(cityBox?.x).toBeLessThan(searchBox?.x ?? 0);
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
