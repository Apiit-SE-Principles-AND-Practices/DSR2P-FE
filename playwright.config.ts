import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  // With 4+ workers on a Windows desktop the first page load of each browser can stall for 30s+.
  workers: 2,
  expect: { timeout: 10_000 },
  use: { baseURL: 'http://localhost:4200' },
  // Serves the build made by `npm run e2e` (a development build, so the app talks to localhost:3000).
  webServer: {
    command: 'node e2e/static-server.mjs',
    url: 'http://localhost:4200',
    reuseExistingServer: true,
  },
});
