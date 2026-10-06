import { expect, test, type Page } from './fixtures';

const LONG_NAME =
  'Traditional Jaffna crab curry served with string hoppers, pol sambol and a side of lunu miris';

/** The API is mocked so these tests need no backend. */
async function mockApi(page: Page, price = '1200') {
  await page.route(/:3000\/categories$/, (route) =>
    route.fulfill({
      json: [
        { id: 2, name: 'Desserts' },
        { id: 5, name: 'Rice' },
      ],
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
  await page.route(/:3000\/restaurants\/r-1\/reviews$/, (route) => route.fulfill({ json: [] }));
  await page.route(/:3000\/restaurants\/r-1\/menu$/, (route) =>
    route.fulfill({
      json: [
        {
          id: 1,
          name: LONG_NAME,
          priceLkr: price,
          isVegetarian: false,
          isVegan: false,
          isHalal: true,
          spiceLevel: 'Hot',
          imageUrl: null,
          categoryId: 5,
        },
        {
          id: 2,
          name: 'Watalappan',
          priceLkr: '450',
          isVegetarian: true,
          isVegan: false,
          isHalal: false,
          spiceLevel: 'None',
          imageUrl: null,
          categoryId: 2,
        },
      ],
    }),
  );
}

test('shows the menu grouped under category headings with formatted prices', async ({ page }) => {
  await mockApi(page);
  await page.goto('/restaurants/r-1');
  await expect(page.getByRole('heading', { level: 3 })).toHaveText(['Desserts', 'Rice']);
  await expect(page.getByText('LKR 450')).toBeVisible();
  await expect(page.getByText('✓ Halal')).toBeVisible();
  await expect(page.getByText('Hot spice')).toBeVisible();
});

for (const width of [375, 1024]) {
  test(`dish name and price stay on the same line at ${String(width)}px`, async ({ page }) => {
    await mockApi(page, '12500');
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/restaurants/r-1');
    const name = page.locator('.name', { hasText: LONG_NAME });
    const price = page.locator('app-menu-item-row', { hasText: LONG_NAME }).locator('.price');
    await expect(name).toBeVisible();
    const [nameBox, priceBox] = [await name.boundingBox(), await price.boundingBox()];
    expect(Math.abs((nameBox?.y ?? 0) - (priceBox?.y ?? 99))).toBeLessThan(4); // first lines line up
    expect(nameBox?.x).toBeLessThan(priceBox?.x ?? 0); // price sits to the right
    expect((priceBox?.x ?? 0) + (priceBox?.width ?? 0)).toBeLessThanOrEqual(width); // and fits
    expect(priceBox?.height).toBeLessThan(40); // the price itself never wraps
  });
}

test('refreshes the menu when the window regains focus, so a price change shows up', async ({
  page,
}) => {
  let price = '1200';
  await mockApi(page);
  await page.route(/:3000\/restaurants\/r-1\/menu$/, (route) =>
    route.fulfill({
      json: [
        {
          id: 2,
          name: 'Watalappan',
          priceLkr: price,
          isVegetarian: true,
          isVegan: false,
          isHalal: false,
          spiceLevel: 'None',
          imageUrl: null,
          categoryId: 2,
        },
      ],
    }),
  );
  await page.goto('/restaurants/r-1');
  await expect(page.getByText('LKR 1,200')).toBeVisible();
  price = '1500'; // an Admin changes it while the tab is open
  // A reload requested while another is still running is ignored, so retry the focus until it lands.
  await expect(async () => {
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expect(page.getByText('LKR 1,500')).toBeVisible({ timeout: 1500 });
  }).toPass();
});
