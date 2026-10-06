import { expect, test, type Page } from '@playwright/test';

const categories = ['Chinese', 'Desserts', 'Pizza', 'Salads', 'Seafood', 'Soups', 'Curries'].map(
  (name, index) => ({ id: index + 1, name }),
);

/** The API is mocked so these tests need no backend. */
const mockCategories = (page: Page) =>
  page.route(/\/categories$/, (route) => route.fulfill({ json: categories }));

// 3 columns below 640px, 6 from 640px (DSR2P-8).
for (const [width, columns] of [
  [375, 3],
  [639, 3],
  [640, 6],
  [1024, 6],
] as const) {
  test(`category grid has ${String(columns)} columns at ${String(width)}px`, async ({ page }) => {
    await mockCategories(page);
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/');
    await expect(page.locator('a.tile')).toHaveCount(categories.length);
    const count = await page
      .locator('.grid')
      .evaluate((grid) => getComputedStyle(grid).gridTemplateColumns.split(' ').length);
    expect(count).toBe(columns);
  });
}

test('tapping a category opens the results filtered by it and the city', async ({ page }) => {
  await mockCategories(page);
  await page.goto('/');
  await page.getByRole('link', { name: 'Seafood' }).click();
  await expect(page).toHaveURL(/\/search\?city=Colombo&categoryId=5$/);
});
