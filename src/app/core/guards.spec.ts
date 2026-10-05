import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../app.routes';
import { ToastService } from '../shared/toast.service';
import { SessionStore, type Role } from './session.store';

/** Navigates the real route map, signed in as `role` (or as a Guest when omitted). */
async function visit(url: string, role?: Role) {
  TestBed.configureTestingModule({
    providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
  });
  if (role) {
    const user = { id: '1', name: 'Ann', email: 'a@b.lk', role, language: 'en' } as const;
    TestBed.inject(SessionStore).start({ token: 't', user });
  }
  await (await RouterTestingHarness.create()).navigateByUrl(url);
  return TestBed.inject(Router).url;
}

describe('route guards', () => {
  afterEach(() => {
    document.documentElement.lang = 'en';
  });

  it('sends a Guest from /admin to login, remembering where they were going', async () => {
    expect(await visit('/admin')).toBe('/login?returnTo=%2Fadmin');
  });

  it('sends a Guest from /account to login with returnTo', async () => {
    expect(await visit('/account')).toBe('/login?returnTo=%2Faccount');
  });

  it('sends a Customer from /admin home with a message', async () => {
    expect(await visit('/admin', 'Customer')).toBe('/');
    expect(
      TestBed.inject(ToastService)
        .toasts()
        .map((t) => t.message),
    ).toEqual(['That page is for administrators.']);
  });

  it('lets an Admin into /admin', async () => {
    expect(await visit('/admin', 'Admin')).toBe('/admin');
  });

  it('lets a Customer into /account', async () => {
    expect(await visit('/account', 'Customer')).toBe('/account');
  });

  ['/login', '/register'].forEach((path) => {
    it(`keeps signed-in users off ${path}`, async () => {
      expect(await visit(path, 'Customer')).toBe('/');
    });
  });
});
