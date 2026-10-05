import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { ToastService } from '../shared/toast.service';
import { SessionStore } from './session.store';

// Guards are a UX convenience only: the server enforces every restricted action (DSR2P-7).

/** Guests go to login and come back to where they were headed. */
export const requireAuth: CanActivateFn = (_route, state) =>
  inject(SessionStore).isAuthenticated() ||
  inject(Router).createUrlTree(['/login'], { queryParams: { returnTo: state.url } });

/** Admin only: Guests log in first, other roles are sent home with a message. */
export const requireAdmin: CanActivateFn = (route, state) => {
  const session = inject(SessionStore);
  if (!session.isAuthenticated()) return requireAuth(route, state);
  if (session.role() === 'Admin') return true;
  inject(ToastService).show('That page is for administrators.', 'error');
  return inject(Router).createUrlTree(['/']);
};

/** Login and register are for Guests; signed-in users go home. */
export const guestOnly: CanActivateFn = () =>
  !inject(SessionStore).isAuthenticated() || inject(Router).createUrlTree(['/']);
