import type { Routes } from '@angular/router';
import { environment } from '../environments/environment';
import { guestOnly, requireAdmin, requireAuth } from './core/guards';
import { HomeComponent } from './pages/home.component';
import { PlaceholderComponent } from './pages/placeholder.component';
import { NotFoundComponent } from './shared/not-found.component';

export const routes: Routes = [
  { path: '', component: HomeComponent, pathMatch: 'full' },
  {
    path: 'search',
    loadComponent: () =>
      import('./pages/search-results.component').then((m) => m.SearchResultsComponent),
  },
  {
    path: 'restaurants/:id',
    loadComponent: () =>
      import('./pages/restaurant-detail/restaurant-detail.component').then(
        (m) => m.RestaurantDetailComponent,
      ),
  },
  {
    path: 'restaurants/:id/review',
    canActivate: [requireAuth],
    loadComponent: () =>
      import('./pages/review-form/review-form.component').then((m) => m.ReviewFormComponent),
  },
  {
    path: 'login',
    canActivate: [guestOnly],
    loadComponent: () => import('./pages/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    canActivate: [guestOnly],
    loadComponent: () =>
      import('./pages/register/register.component').then((m) => m.RegisterComponent),
  },
  // Placeholders until the real screens land (6.1 account, 35 admin dashboard).
  {
    path: 'account',
    canActivate: [requireAuth],
    component: PlaceholderComponent,
    data: { title: 'Account' },
  },
  {
    path: 'admin',
    canActivate: [requireAdmin],
    component: PlaceholderComponent,
    data: { title: 'Admin dashboard' },
  },
  ...environment.devRoutes,
  { path: '**', component: NotFoundComponent },
];
