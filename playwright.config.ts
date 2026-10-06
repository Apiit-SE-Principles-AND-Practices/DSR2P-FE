import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  // The dev server compiles lazy routes on first use, which can be slow when tests run in parallel.
  expect: { timeout: 10_000 },
  use: { baseURL: 'http://localhost:4200' },
  webServer: { command: 'npm start', url: 'http://localhost:4200', reuseExistingServer: true },
});
