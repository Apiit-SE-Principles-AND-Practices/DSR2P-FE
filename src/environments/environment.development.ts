import type { Environment } from './environment.model';

export const environment: Environment = {
  apiBaseUrl: 'http://localhost:3000',
  devRoutes: [
    {
      path: 'dev/tokens',
      loadComponent: () =>
        import('../app/dev/dev-tokens.component').then((m) => m.DevTokensComponent),
    },
  ],
};
