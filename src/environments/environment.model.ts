import type { Routes } from '@angular/router';

export interface Environment {
  /** Prefixed onto every relative API call by the API interceptor. */
  apiBaseUrl: string;
  /** Routes that must never ship in a production build (e.g. /dev/tokens). */
  devRoutes: Routes;
}
