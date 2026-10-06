import { expect, test, type Page } from '@playwright/test';

const restaurant = {
  id: 'r-1',
  name: 'Ceylon Spice House',
  city: 'Colombo',
  address: '12 Galle Road',
  imageUrl: null,
  categories: [{ id: 4, name: 'Rice & Biryani' }],
  averageRating: 4.3,
  priceBand: 'Moderate',
};

/** The API is mocked so these tests need no backend. */
async function mockApi(page: Page) {
  await page.route(/:3000\/categories$/, (route) => route.fulfill({ json: [] }));
  await page.route(/:3000\/restaurants\/(r-1|missing)\/menu$/, (route) =>
    route.fulfill({ json: [] }),
  );
  await page.route(/:3000\/restaurants\/r-1\/reviews$/, (route) =>
    route.fulfill({
      json: [
        {
          id: 1,
          foodQualityRating: 5,
          serviceRating: 4,
          miscRating: 4,
          reviewText: 'Lovely.',
          language: 'en',
          createdAt: '2026-10-05T12:00:00Z',
          comments: [],
          response: null,
        },
        {
          id: 2,
          foodQualityRating: 4,
          serviceRating: 4,
          miscRating: 3,
          reviewText: 'Lovely.',
          language: 'en',
          createdAt: '2026-10-05T12:00:00Z',
          comments: [],
          response: null,
        },
      ],
    }),
  );
  await page.route(/:3000\/restaurants\/r-1$/, (route) => route.fulfill({ json: restaurant }));
  await page.route(/:3000\/restaurants\/missing$/, (route) =>
    route.fulfill({ status: 404, json: { error: { code: 'NOT_FOUND', message: 'x' } } }),
  );
  await page.route(/:3000\/restaurants\/missing\/reviews$/, (route) => route.fulfill({ json: [] }));
}

test('shows the restaurant, the three rating bars and the page title', async ({ page }) => {
  await mockApi(page);
  await page.goto('/restaurants/r-1');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ceylon Spice House');
  await expect(page).toHaveTitle('Ceylon Spice House · Ruchi');
  await expect(page.getByRole('meter')).toHaveCount(3);
  await expect(page.getByRole('meter', { name: 'Service: 4.0 out of 5' })).toBeVisible();
});

test('an unknown restaurant shows the Not Found view', async ({ page }) => {
  await mockApi(page);
  await page.goto('/restaurants/missing');
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
});

test('a Guest tapping "Write a review" is asked to log in', async ({ page }) => {
  await mockApi(page);
  await page.goto('/restaurants/r-1');
  await page.getByRole('button', { name: 'Write a review' }).click();
  await expect(page.getByRole('dialog', { name: 'Log in required' })).toBeVisible();
});

// Sections stack below 1024px and sit in two columns from there (DSR2P-14).
for (const [width, columns] of [
  [1023, 1],
  [1024, 2],
] as const) {
  test(`sections use ${String(columns)} column(s) at ${String(width)}px`, async ({ page }) => {
    await mockApi(page);
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/restaurants/r-1');
    await expect(page.getByRole('meter')).toHaveCount(3);
    const count = await page
      .locator('.sections')
      .evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length);
    expect(count).toBe(columns);
  });
}
