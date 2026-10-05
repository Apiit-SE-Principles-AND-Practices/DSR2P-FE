import type { Routes } from '@angular/router';
import { environment } from '../environments/environment';
import { HomeComponent } from './pages/home.component';
import { NotFoundComponent } from './shared/not-found.component';

export const routes: Routes = [
  { path: '', component: HomeComponent, pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then((m) => m.LoginComponent),
  },
  ...environment.devRoutes,
  { path: '**', component: NotFoundComponent },
];
