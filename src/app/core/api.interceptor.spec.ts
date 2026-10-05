import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { Router } from '@angular/router';
import { ToastService } from '../shared/toast.service';
import { SessionStore } from './session.store';
import { apiInterceptor, REQUEST_TIMEOUT_MS, type ApiError } from './api.interceptor';

describe('apiInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });

  /** Subscribes and returns a getter for the normalised error. */
  function errorOf(url: string) {
    let error: ApiError | undefined;
    http.get(url).subscribe({ error: (e: ApiError) => (error = e) });
    return () => error;
  }

  it('prefixes relative URLs with the base URL and sends Accept-Language', () => {
    http.get('/restaurants').subscribe();
    const req = backend.expectOne(`${environment.apiBaseUrl}/restaurants`);
    expect(req.request.headers.get('Accept-Language')).toBe(document.documentElement.lang);
  });

  it('leaves absolute URLs alone', () => {
    http.get('https://cdn.example.com/a.json').subscribe();
    backend.expectOne('https://cdn.example.com/a.json');
  });

  it('flattens the backend validation envelope to the first message per field', () => {
    const error = errorOf('/auth/register');
    backend.expectOne(`${environment.apiBaseUrl}/auth/register`).flush(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request failed validation',
          details: { formErrors: [], fieldErrors: { email: ['Invalid email address', 'Other'] } },
        },
      },
      { status: 400, statusText: 'Bad Request' },
    );
    expect(error()).toEqual({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'Request failed validation',
      fieldErrors: { email: 'Invalid email address' },
    });
  });

  it('keeps code and message for non-validation errors', () => {
    const error = errorOf('/auth/register');
    backend
      .expectOne(`${environment.apiBaseUrl}/auth/register`)
      .flush(
        { error: { code: 'CONFLICT', message: 'Email already registered' } },
        { status: 409, statusText: 'Conflict' },
      );
    expect(error()).toEqual({
      status: 409,
      code: 'CONFLICT',
      message: 'Email already registered',
      fieldErrors: undefined,
    });
  });

  it('reports a dropped connection as NETWORK_ERROR', () => {
    const error = errorOf('/restaurants');
    backend.expectOne(`${environment.apiBaseUrl}/restaurants`).error(new ProgressEvent('error'));
    expect(error()?.code).toBe('NETWORK_ERROR');
  });

  it('reports a request exceeding the timeout as NETWORK_ERROR', fakeAsync(() => {
    const error = errorOf('/restaurants');
    tick(REQUEST_TIMEOUT_MS);
    expect(error()?.code).toBe('NETWORK_ERROR');
  }));

  describe('session errors', () => {
    const signIn = () => {
      TestBed.inject(SessionStore).start({
        token: 't',
        user: { id: '1', name: 'Ann', email: 'a@b.lk', role: 'Customer', language: 'en' },
      });
    };
    const toasts = () =>
      TestBed.inject(ToastService)
        .toasts()
        .map((t) => t.message);

    afterEach(() => {
      document.documentElement.lang = 'en';
    });

    it('a 401 while signed in logs out and sends the user to login, returning here afterwards', () => {
      signIn();
      const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
      const error = errorOf('/users/me/reviews');
      backend
        .expectOne(`${environment.apiBaseUrl}/users/me/reviews`)
        .flush(
          { error: { code: 'UNAUTHORIZED', message: 'Not logged in' } },
          { status: 401, statusText: 'x' },
        );
      expect(error()?.status).toBe(401);
      expect(TestBed.inject(SessionStore).isAuthenticated()).toBeFalse();
      expect(toasts()).toEqual(['Your session has expired. Please log in again.']);
      expect(navigate).toHaveBeenCalledWith(['/login'], { queryParams: { returnTo: '/' } });
    });

    it('a 401 for a Guest (e.g. wrong password) is left to the form', () => {
      const navigate = spyOn(TestBed.inject(Router), 'navigate');
      errorOf('/auth/login');
      backend
        .expectOne(`${environment.apiBaseUrl}/auth/login`)
        .flush({}, { status: 401, statusText: 'x' });
      expect(navigate).not.toHaveBeenCalled();
      expect(toasts()).toEqual([]);
    });

    it('a 403 explains the refusal without logging the user out', () => {
      signIn();
      errorOf('/admin/dashboard/stats');
      backend
        .expectOne(`${environment.apiBaseUrl}/admin/dashboard/stats`)
        .flush(
          { error: { code: 'FORBIDDEN', message: 'Admins only' } },
          { status: 403, statusText: 'x' },
        );
      expect(TestBed.inject(SessionStore).isAuthenticated()).toBeTrue();
      expect(toasts()).toEqual(['You do not have permission to do that.']);
    });

    it('leaves 404, 409 and 5xx to the calling screen', () => {
      signIn();
      [404, 409, 500].forEach((status) => {
        const error = errorOf('/restaurants/1');
        backend
          .expectOne(`${environment.apiBaseUrl}/restaurants/1`)
          .flush({}, { status, statusText: 'x' });
        expect(error()?.status).toBe(status);
      });
      expect(toasts()).toEqual([]);
      expect(TestBed.inject(SessionStore).isAuthenticated()).toBeTrue();
    });
  });
});
