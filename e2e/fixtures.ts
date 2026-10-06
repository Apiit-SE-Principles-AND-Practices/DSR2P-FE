import { test as base } from '@playwright/test';

export { expect, type Page } from '@playwright/test';

/**
 * Every spec imports `test` from here. Google Fonts stylesheets block the page's `load` event, so a slow
 * connection made `page.goto` time out at random; the tests do not need the fonts, so those requests are dropped.
 */
export const test = base.extend({
  context: async ({ context }, use) => {
    await context.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort());
    await use(context);
  },
});
