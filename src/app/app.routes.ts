import type { Routes } from '@angular/router';
import { environment } from '../environments/environment';
import { guestOnly, requireAdmin, requireAuth, unsavedChangesGuard } from './core/guards';
import { HomeComponent } from './pages/home.component';
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
  {
    path: 'account/reviews',
    canActivate: [requireAuth],
    loadComponent: () =>
      import('./pages/account/my-reviews.component').then((m) => m.MyReviewsComponent),
  },
  {
    path: 'account',
    canActivate: [requireAuth],
    loadComponent: () =>
      import('./pages/account/account.component').then((m) => m.AccountComponent),
  },
  {
    path: 'admin',
    canActivate: [requireAdmin],
    loadComponent: () =>
      import('./pages/admin/admin-dashboard.component').then((m) => m.AdminDashboardComponent),
  },
  {
    path: 'admin/restaurants',
    canActivate: [requireAdmin],
    loadComponent: () =>
      import('./pages/admin/admin-restaurants.component').then((m) => m.AdminRestaurantsComponent),
  },
  {
    path: 'moderation-guidelines',
    loadComponent: () =>
      import('./pages/moderation-guidelines.component').then(
        (m) => m.ModerationGuidelinesComponent,
      ),
  },
  {
    path: 'admin/moderation',
    canActivate: [requireAdmin],
    loadComponent: () =>
      import('./pages/admin/moderation-queue.component').then((m) => m.ModerationQueueComponent),
  },
  ...['admin/restaurants/new', 'admin/restaurants/:id/edit'].map((path) => ({
    path,
    canActivate: [requireAdmin],
    canDeactivate: [unsavedChangesGuard],
    loadComponent: () =>
      import('./pages/admin/restaurant-form.component').then((m) => m.RestaurantFormComponent),
  })),
  ...environment.devRoutes,
  { path: '**', component: NotFoundComponent },
];
