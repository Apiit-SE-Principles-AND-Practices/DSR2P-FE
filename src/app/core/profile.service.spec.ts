import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { setUiLanguage } from './languages';
import { ProfileService } from './profile.service';
import { SessionStore, type PublicUser } from './session.store';

const ann: PublicUser = {
  id: 'u1',
  name: 'Ann',
  email: 'ann@example.com',
  role: 'Customer',
  language: 'en',
};

describe('ProfileService', () => {
  afterEach(() => {
    localStorage.removeItem('language');
    setUiLanguage('en');
    localStorage.removeItem('language');
  });

  it('PATCHes /users/me with only what changed, then updates the signed-in user', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const session = TestBed.inject(SessionStore);
    session.start({ token: 'jwt', user: ann });
    const backend = TestBed.inject(HttpTestingController);

    let result: PublicUser | undefined;
    TestBed.inject(ProfileService)
      .update({ name: 'Ann Perera' })
      .subscribe((user) => (result = user));
    const req = backend.expectOne((r) => r.url.endsWith('/users/me'));
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ name: 'Ann Perera' });
    req.flush({ ...ann, name: 'Ann Perera' });

    expect(result?.name).toBe('Ann Perera');
    expect(session.user()?.name).toBe('Ann Perera');
    expect(session.token()).toBe('jwt'); // still signed in
  });

  it('leaves the signed-in user alone when the save fails', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const session = TestBed.inject(SessionStore);
    session.start({ token: 'jwt', user: ann });
    const backend = TestBed.inject(HttpTestingController);

    TestBed.inject(ProfileService)
      .update({ language: 'ta' })
      .subscribe({ error: () => undefined });
    backend
      .expectOne((r) => r.url.endsWith('/users/me'))
      .flush({}, { status: 500, statusText: 'x' });
    expect(session.user()?.language).toBe('en');
  });
});
