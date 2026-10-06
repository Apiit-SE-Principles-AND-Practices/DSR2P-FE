import { expect, test } from '@playwright/test';

const restaurant = (name: string) => ({
  id: name,
  name,
  city: 'Colombo',
  address: '',
  imageUrl: null,
  categories: [],
  averageRating: null,
  priceBand: null,
});

// The API is mocked so the test needs no backend.
test('searching by name from Home lists the matching restaurants', async ({ page }) => {
  await page.route(/\/categories$/, (route) => route.fulfill({ json: [] }));
  await page.route(/\/restaurants\/search/, (route) =>
    route.fulfill({
      json: {
        data: [restaurant('Colombo Kottu House'), restaurant('Sea Spray')],
        page: 1,
        pageSize: 100,
        total: 2,
        totalPages: 1,
      },
    }),
  );
  await page.goto('/');
  await page.getByLabel('Search restaurants').fill('kottu');
  await page.getByLabel('Search restaurants').press('Enter');

  await expect(page).toHaveURL(/\/search\?q=kottu$/);
  await expect(page.locator('a.card')).toHaveText(/Colombo Kottu House/);
  await expect(page.locator('a.card')).toHaveCount(1);
  await expect(page.getByText('1 restaurant found')).toBeVisible();
});

// Cards: image beside the text on mobile, image above the text from 640px (DSR2P-13).
for (const [width, direction] of [
  [375, 'row'],
  [639, 'row'],
  [640, 'column'],
  [1024, 'column'],
] as const) {
  test(`result card is a ${direction} at ${String(width)}px`, async ({ page }) => {
    await page.route(/\/restaurants\/search/, (route) =>
      route.fulfill({
        json: { data: [restaurant('Sea Spray')], page: 1, pageSize: 12, total: 1, totalPages: 1 },
      }),
    );
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/search');
    const card = page.locator('a.card');
    await expect(card).toHaveCount(1);
    expect(await card.evaluate((el) => getComputedStyle(el).flexDirection)).toBe(direction);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
      false,
    );
  });
}

// Filters: a bottom sheet with Apply below 640px, inline and immediate from 640px (DSR2P-11).
test.describe('filters', () => {
  test.beforeEach(async ({ page }) => {
    await page.route(/\/categories$/, (route) =>
      route.fulfill({ json: [{ id: 5, name: 'Seafood' }] }),
    );
    await page.route(/\/restaurants\/search/, (route) =>
      route.fulfill({
        json: { data: [restaurant('Sea Spray')], page: 1, pageSize: 12, total: 1, totalPages: 1 },
      }),
    );
  });

  test('on mobile, edits wait in the sheet until Apply', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto('/search');
    await expect(page.getByLabel('Price band')).toBeHidden(); // controls are inside the closed sheet
    await page.getByRole('button', { name: 'Filters (0)' }).click();
    await page.getByLabel('Price band').selectOption('Budget');
    await page.getByRole('button', { name: /Halal/ }).click();
    await expect(page).toHaveURL(/\/search$/); // nothing applied yet
    await page.getByRole('button', { name: 'Apply' }).click();
    await expect(page).toHaveURL(/\/search\?diet=Halal&price=Budget$/);
    await expect(page.getByRole('button', { name: 'Filters (2)' })).toBeVisible();
  });

  test('on wide screens, filters apply immediately and Clear all removes them', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1024, height: 800 });
    await page.goto('/search');
    await expect(page.getByRole('button', { name: /Filters/ })).toHaveCount(0);
    await page.getByLabel('Category').selectOption('5');
    await expect(page).toHaveURL(/\/search\?categoryId=5$/);
    await page.getByRole('button', { name: 'Vegan' }).click();
    await expect(page.getByRole('button', { name: '✓ Vegan' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await page.getByRole('button', { name: 'Clear all' }).click();
    await expect(page).toHaveURL(/\/search$/);
  });

  // Sort (DSR2P-12): outside the sheet on mobile, inline on wide screens; the choice reaches the API.
  for (const width of [375, 1024]) {
    test(`sort at ${String(width)}px updates the URL and the request`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/search');
      await expect(page.getByLabel('Sort by')).toHaveValue('rating'); // Top rated by default
      const request = page.waitForRequest(/\/restaurants\/search\?.*sort=price/);
      await page.getByLabel('Sort by').selectOption('price');
      await request;
      await expect(page).toHaveURL(/\/search\?sort=price$/);
    });
  }

  test('the sort in the URL is shown after a reload', async ({ page }) => {
    await page.goto('/search?sort=price');
    await expect(page.getByLabel('Sort by')).toHaveValue('price');
    await page.reload();
    await expect(page.getByLabel('Sort by')).toHaveValue('price');
  });
});
