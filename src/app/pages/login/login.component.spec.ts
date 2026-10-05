import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { apiInterceptor } from '../../core/api.interceptor';
import { SessionStore, type PublicUser, type Role } from '../../core/session.store';
import { LoginComponent } from './login.component';

const user = (role: Role): PublicUser => ({
  id: '1',
  name: 'Ann',
  email: 'ann@example.com',
  role,
  language: 'en',
});

function setup(returnTo: string | null = null) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      provideHttpClient(withInterceptors([apiInterceptor])),
      provideHttpClientTesting(),
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { queryParamMap: convertToParamMap(returnTo ? { returnTo } : {}) } },
      },
    ],
  });
  const navigate = spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
  const backend = TestBed.inject(HttpTestingController);
  const fixture = TestBed.createComponent(LoginComponent);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;

  const input = (type: string) => {
    const control = el.querySelector<HTMLInputElement>(`input[type=${type}]`);
    if (!control) throw new Error(`No ${type} input`);
    return control;
  };
  const fill = (email: string, password: string) => {
    input('email').value = email;
    input('email').dispatchEvent(new Event('input'));
    input('password').value = password;
    input('password').dispatchEvent(new Event('input'));
  };
  const submit = () => {
    el.querySelector('form')?.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  };
  const respond = (status: number, body: object) => {
    const req = backend.expectOne(`${environment.apiBaseUrl}/auth/login`);
    req.flush(body, { status, statusText: String(status) });
    fixture.detectChanges();
  };
  return { el, input, fill, submit, respond, navigate, backend, fixture };
}

describe('LoginComponent', () => {
  it('BB03 — a valid Customer login lands on home', () => {
    const { fill, submit, respond, navigate } = setup();
    fill('ann@example.com', 'Password123');
    submit();
    respond(200, { token: 't', user: user('Customer') });
    expect(navigate).toHaveBeenCalledWith('/');
    expect(TestBed.inject(SessionStore).isAuthenticated()).toBeTrue();
  });

  it('an Admin login lands on /admin', () => {
    const { fill, submit, respond, navigate } = setup();
    fill('ann@example.com', 'Password123');
    submit();
    respond(200, { token: 't', user: user('Admin') });
    expect(navigate).toHaveBeenCalledWith('/admin');
  });

  it('returns a Customer to returnTo', () => {
    const { fill, submit, respond, navigate } = setup('/restaurants/7');
    fill('ann@example.com', 'Password123');
    submit();
    respond(200, { token: 't', user: user('Customer') });
    expect(navigate).toHaveBeenCalledWith('/restaurants/7');
  });

  it('ignores an external returnTo', () => {
    const { fill, submit, respond, navigate } = setup('//evil.com');
    fill('ann@example.com', 'Password123');
    submit();
    respond(200, { token: 't', user: user('Customer') });
    expect(navigate).toHaveBeenCalledWith('/');
  });

  it('BB04 — wrong credentials show one generic message and clear only the password', () => {
    const { el, input, fill, submit, respond, navigate } = setup();
    fill('ann@example.com', 'wrong');
    submit();
    respond(401, { error: { code: 'UNAUTHORIZED', message: 'Invalid email or password' } });
    expect(el.querySelector('[role=alert]')?.textContent).toContain(
      'Email or password is incorrect.',
    );
    expect(input('password').value).toBe('');
    expect(input('email').value).toBe('ann@example.com');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('explains rate limiting', () => {
    const { el, fill, submit, respond } = setup();
    fill('ann@example.com', 'x');
    submit();
    respond(429, { error: { code: 'TOO_MANY_REQUESTS', message: 'slow down' } });
    expect(el.querySelector('[role=alert]')?.textContent).toContain('Too many attempts');
  });

  it('sends no request when the form is incomplete', () => {
    const { el, backend, fill, submit } = setup();
    fill('not-an-email', '');
    submit();
    backend.expectNone(`${environment.apiBaseUrl}/auth/login`);
    expect(el.querySelectorAll('.field-error').length).toBe(2);
  });
});
