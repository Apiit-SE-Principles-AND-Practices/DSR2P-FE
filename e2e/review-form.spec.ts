import { expect, test, type Page } from './fixtures';

const REVIEW_URL = '/restaurants/r-1/review';

/** The API is mocked so these tests need no backend. `failFirst` makes the first submit fail. */
async function mockApi(page: Page, { failFirst = false } = {}) {
  const posted: string[] = [];
  await page.route(/:3000\/auth\/login$/, (route) =>
    route.fulfill({
      status: 200,
      json: {
        token: 'jwt',
        user: { id: 'u1', name: 'Ann', email: 'ann@example.com', role: 'Customer', language: 'en' },
      },
    }),
  );
  await page.route(/:3000\/restaurants\/r-1$/, (route) =>
    route.fulfill({
      json: {
        id: 'r-1',
        name: 'Ceylon Spice House',
        city: 'Colombo',
        address: '12 Galle Road',
        imageUrl: null,
        categories: [],
        averageRating: null,
        priceBand: null,
      },
    }),
  );
  await page.route(/:3000\/restaurants\/r-1\/menu$/, (route) =>
    route.fulfill({
      json: [
        {
          id: 7,
          name: 'Chicken Kottu',
          priceLkr: '1200',
          isVegetarian: false,
          isVegan: false,
          isHalal: true,
          spiceLevel: 'Hot',
          imageUrl: null,
          categoryId: null,
        },
      ],
    }),
  );
  await page.route(/:3000\/restaurants\/r-1\/reviews$/, (route) => route.fulfill({ json: [] }));
  await page.route(/:3000\/categories$/, (route) => route.fulfill({ json: [] }));
  await page.route(/:3000\/reviews$/, (route) => {
    posted.push(route.request().postData() ?? '');
    if (failFirst && posted.length === 1) {
      return route.fulfill({
        status: 500,
        json: { error: { code: 'INTERNAL_ERROR', message: 'Server error.' } },
      });
    }
    return route.fulfill({ status: 201, json: { id: 1, status: 'Pending' } });
  });
  return posted;
}

/** Logs in through the page, which sends the user on to the review form without a reload. */
async function openForm(page: Page) {
  await page.goto(`/login?returnTo=${encodeURIComponent(REVIEW_URL)}`);
  await page.getByLabel('Email').fill('ann@example.com');
  await page.getByLabel('Password', { exact: true }).fill('Password123');
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page.getByRole('heading', { name: 'Write a review' })).toBeVisible();
}
const stars = (page: Page, group: string) =>
  page.getByRole('group', { name: group }).locator('label.star');

test('a Guest is sent to log in first and comes back to the form', async ({ page }) => {
  await mockApi(page);
  await page.goto(REVIEW_URL);
  await expect(page).toHaveURL(/\/login\?returnTo=%2Frestaurants%2Fr-1%2Freview$/);
  await openForm(page);
  await expect(page).toHaveURL(/\/restaurants\/r-1\/review$/);
});

test('ratings can be chosen with the keyboard, and Submit stays disabled until complete', async ({
  page,
}) => {
  await mockApi(page);
  await openForm(page);
  const submit = page.getByRole('button', { name: 'Submit review' });
  await expect(submit).toBeDisabled();

  await stars(page, 'Food quality').nth(0).click();
  await page.keyboard.press('ArrowRight'); // moves to 2 stars within the same group
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('input[name=food]:checked')).toHaveValue('3');

  await stars(page, 'Service').nth(3).click();
  await stars(page, 'Other').nth(4).click();
  await expect(submit).toBeDisabled(); // still no text
  await page.getByLabel(/Your review/).fill('Great flavours.');
  await expect(submit).toBeEnabled();
});

test('a failed send keeps everything, then Retry succeeds and a pending notice is shown', async ({
  page,
}) => {
  const posted = await mockApi(page, { failFirst: true });
  await openForm(page);
  await stars(page, 'Food quality').nth(4).click();
  await stars(page, 'Service').nth(3).click();
  await stars(page, 'Other').nth(2).click();
  await page.getByLabel('Which dish? (optional)').selectOption('7');
  await page.getByLabel(/Your review/).fill('Great flavours.');
  await page.getByRole('button', { name: 'Submit review' }).click();

  await expect(page.getByRole('alert')).toContainText('We couldn’t send your review.');
  await expect(page.getByLabel(/Your review/)).toHaveValue('Great flavours.');
  await expect(page.locator('input[name=food]:checked')).toHaveValue('5');
  await expect(page).toHaveURL(/\/restaurants\/r-1\/review$/);

  await page.getByRole('button', { name: 'Retry' }).click();
  await expect(page).toHaveURL(/\/restaurants\/r-1$/);
  await expect(page.getByRole('status')).toContainText('will appear once a moderator approves it');
  await expect(page.locator('app-review-card')).toHaveCount(0); // nothing added to the public list

  expect(posted).toHaveLength(2);
  expect(posted[1]).toContain('name="reviewText"');
  expect(posted[1]).toContain('Great flavours.');
  expect(posted[1]).toContain('name="itemId"');
});

test('the form fits a phone screen', async ({ page }) => {
  await mockApi(page);
  await page.setViewportSize({ width: 375, height: 800 });
  await openForm(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});
