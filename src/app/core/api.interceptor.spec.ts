import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { environment } from '../../environments/environment';
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
});
