import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { apiInterceptor, type ApiError } from './api.interceptor';
import { SessionStore, type AuthResult } from './session.store';

const API = environment.apiBaseUrl;
const credentials = { email: 'a@b.lk', password: 'Password123' };
const admin: AuthResult = {
  token: 'jwt-123',
  user: { id: '1', name: 'Ann', email: 'a@b.lk', role: 'Admin', language: 'si' },
};

describe('SessionStore', () => {
  afterEach(() => {
    document.documentElement.lang = 'en';
  });

  let store: SessionStore;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    store = TestBed.inject(SessionStore);
    backend = TestBed.inject(HttpTestingController);
  });

  /** Runs login against the mock backend. */
  function login(response: AuthResult) {
    store.login(credentials).subscribe();
    const req = backend.expectOne(`${API}/auth/login`);
    expect(req.request.body).toEqual(credentials);
    req.flush(response);
  }

  it('starts logged out', () => {
    expect(store.isAuthenticated()).toBeFalse();
    expect(store.user()).toBeNull();
    expect(store.role()).toBeNull();
  });

  it('exposes user, role and authentication after login', () => {
    login(admin);
    expect(store.isAuthenticated()).toBeTrue();
    expect(store.user()).toEqual(admin.user);
    expect(store.role()).toBe('Admin');
  });

  it('stays logged out and surfaces the error when credentials are wrong', () => {
    let error: ApiError | undefined;
    store.login(credentials).subscribe({ error: (e: ApiError) => (error = e) });
    backend
      .expectOne(`${API}/auth/login`)
      .flush(
        { error: { code: 'UNAUTHORIZED', message: 'Invalid email or password' } },
        { status: 401, statusText: 'Unauthorized' },
      );
    expect(error?.status).toBe(401);
    expect(store.isAuthenticated()).toBeFalse();
  });

  it('applies the saved language of the user when a session starts', () => {
    login(admin);
    expect(document.documentElement.lang).toBe('si');
  });

  it('registers through /auth/register and starts a session', () => {
    const input = {
      name: 'Ann',
      email: 'a@b.lk',
      password: 'Password123',
      language: 'ta' as const,
    };
    store.register(input).subscribe();
    const req = backend.expectOne(`${API}/auth/register`);
    expect(req.request.body).toEqual(input);
    req.flush(admin);
    expect(store.isAuthenticated()).toBeTrue();
  });

  it('updateUser swaps the user but keeps the session', () => {
    login(admin);
    store.updateUser({ ...admin.user, name: 'Ann Perera' });
    expect(store.user()?.name).toBe('Ann Perera');
    expect(store.token()).toBe('jwt-123');
    expect(store.isAuthenticated()).toBeTrue();
  });

  it('updateUser does nothing when nobody is signed in', () => {
    store.updateUser(admin.user);
    expect(store.isAuthenticated()).toBeFalse();
  });

  it('clears everything on logout', () => {
    login(admin);
    store.logout();
    expect(store.isAuthenticated()).toBeFalse();
    expect(store.token()).toBeNull();
  });

  it('sends the bearer token to the API only while logged in', () => {
    const http = TestBed.inject(HttpClient);
    login(admin);

    http.get('/health').subscribe();
    expect(backend.expectOne(`${API}/health`).request.headers.get('Authorization')).toBe(
      'Bearer jwt-123',
    );

    http.get('https://cdn.example.com/a.json').subscribe();
    expect(
      backend.expectOne('https://cdn.example.com/a.json').request.headers.has('Authorization'),
    ).toBeFalse();

    store.logout();
    http.get('/health').subscribe();
    expect(backend.expectOne(`${API}/health`).request.headers.has('Authorization')).toBeFalse();
  });
});
