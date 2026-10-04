import type { Environment } from './environment.model';

/** Production defaults. Replaced by environment.development.ts in the development build. */
export const environment: Environment = {
  apiBaseUrl: '/api',
  devRoutes: [],
};
