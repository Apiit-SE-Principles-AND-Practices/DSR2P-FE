import { expect, test, type Page } from './fixtures';

const reply = (id: number, status: string) => ({
  id,
  commentText: `Reply ${String(id)} (${status})`,
  status,
  createdAt: '2026-10-06T12:00:00Z',
});

// Newest first, as the API sends them. Review 2 is the best rated, review 3 the worst.
const reviews = [
  {
    id: 3,
    foodQualityRating: 2,
    serviceRating: 2,
    miscRating: 2,
    reviewText: 'Cold food.',
    language: 'en',
    createdAt: '2026-10-03T12:00:00Z',
    comments: [],
    response: null,
  },
  {
    id: 2,
    foodQualityRating: 5,
    serviceRating: 5,
    miscRating: 5,
    reviewText: 'Wonderful.\nWill return.',
    language: 'en',
    createdAt: '2026-10-02T12:00:00Z',
    comments: [reply(1, 'Approved'), reply(2, 'Pending'), reply(3, 'Rejected')],
    response: { responseText: 'Thank you for visiting!', createdAt: '2026-10-04T12:00:00Z' },
    images: [{ id: 1, imageUrl: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=' }],
  },
  {
    id: 1,
    foodQualityRating: 4,
    serviceRating: 4,
    miscRating: 4,
    reviewText: 'Good.',
    language: 'en',
    createdAt: '2026-10-01T12:00:00Z',
    comments: [],
    response: null,
  },
];

/** The API is mocked so these tests need no backend. */
async function mockApi(page: Page, list = reviews) {
  await page.route(/:3000\/categories$/, (route) => route.fulfill({ json: [] }));
  await page.route(/:3000\/restaurants\/r-1\/menu$/, (route) => route.fulfill({ json: [] }));
  await page.route(/:3000\/restaurants\/r-1\/reviews$/, (route) => route.fulfill({ json: list }));
  await page.route(/:3000\/restaurants\/r-1$/, (route) =>
    route.fulfill({
      json: {
        id: 'r-1',
        name: 'Ceylon Spice House',
        city: 'Colombo',
        address: '12 Galle Road',
        imageUrl: null,
        categories: [],
        averageRating: 3.7,
        priceBand: null,
      },
    }),
  );
}
const texts = (page: Page) => page.locator('app-review-card > article > .text').allTextContents();

test('lists the reviews with the count, newest first', async ({ page }) => {
  await mockApi(page);
  await page.goto('/restaurants/r-1');
  await expect(page.getByRole('heading', { name: 'Reviews (3)' })).toBeVisible();
  expect(await texts(page)).toEqual(['Cold food.', 'Wonderful.\nWill return.', 'Good.']);
});

test('sorting changes the order, is kept in the URL and survives a reload', async ({ page }) => {
  await mockApi(page);
  await page.goto('/restaurants/r-1');
  await page.getByLabel('Sort reviews').selectOption('highest');
  await expect(page).toHaveURL(/\/restaurants\/r-1\?reviewSort=highest$/);
  expect(await texts(page)).toEqual(['Wonderful.\nWill return.', 'Good.', 'Cold food.']);

  await page.reload();
  await expect(page.getByLabel('Sort reviews')).toHaveValue('highest');
  expect(await texts(page)).toEqual(['Wonderful.\nWill return.', 'Good.', 'Cold food.']);
});

test('shows the response, only approved replies, and keeps the line breaks', async ({ page }) => {
  await mockApi(page);
  await page.goto('/restaurants/r-1');
  const card = page.locator('app-review-card', { hasText: 'Wonderful' });
  await expect(card.getByLabel('Response from the restaurant')).toContainText(
    'Thank you for visiting!',
  );
  await expect(card.locator('.replies li p')).toHaveText(['Reply 1 (Approved)']);
  await expect(page.getByText(/Pending|Rejected/)).toHaveCount(0);
  // pre-line: the typed line break renders as two lines, not one
  const lines = await card
    .locator('> article > .text')
    .evaluate((el) =>
      Math.round(el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight)),
    );
  expect(lines).toBe(2);
});

test('a review photo has alt text and opens larger in a dialog', async ({ page }) => {
  await mockApi(page);
  await page.goto('/restaurants/r-1');
  const thumb = page.locator('.thumb img');
  await expect(thumb).toHaveAttribute('alt', 'Photo attached to this review');
  await thumb.click();
  await expect(page.getByRole('dialog', { name: 'Review photo' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('with no reviews, offers to write the first one', async ({ page }) => {
  await mockApi(page, []);
  await page.goto('/restaurants/r-1');
  await expect(page.getByText('No approved reviews yet.')).toBeVisible();
  await page.getByRole('button', { name: 'Write a review' }).last().click();
  await expect(page.getByRole('dialog', { name: 'Log in required' })).toBeVisible();
});

test('two columns from 1024px put reviews beside the menu', async ({ page }) => {
  await mockApi(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/restaurants/r-1');
  const [menu, reviewsBox] = [
    await page.locator('app-menu-section').boundingBox(),
    await page.locator('app-reviews-section').boundingBox(),
  ];
  expect(reviewsBox?.x).toBeGreaterThan((menu?.x ?? 0) + (menu?.width ?? 0) - 1);
});
