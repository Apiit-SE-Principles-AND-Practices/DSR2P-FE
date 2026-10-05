import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { apiInterceptor } from '../../core/api.interceptor';
import { SessionStore } from '../../core/session.store';
import { RegisterComponent } from './register.component';

const URL = `${environment.apiBaseUrl}/auth/register`;
const customer = { id: '1', name: 'Nimal', email: 'n@x.lk', role: 'Customer', language: 'si' };

function setup() {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      provideHttpClient(withInterceptors([apiInterceptor])),
      provideHttpClientTesting(),
    ],
  });
  const navigate = spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
  const backend = TestBed.inject(HttpTestingController);
  const fixture = TestBed.createComponent(RegisterComponent);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;

  const control = (selector: string) => {
    const found = el.querySelector<HTMLInputElement>(selector);
    if (!found) throw new Error(`Missing ${selector}`);
    return found;
  };
  const type = (id: string, value: string) => {
    const input = control(`#${id}`);
    input.value = value;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
  };
  const fillValid = (email = 'Nimal@Example.com') => {
    type('name', ' Nimal ');
    type('email', email);
    type('password', 'Password123');
    type('confirmPassword', 'Password123');
  };
  /** Picks a language by its visible label, since Angular does not put `value` on the DOM radio. */
  const chooseLanguage = (label: string) => {
    Array.from(el.querySelectorAll('label.choice'))
      .find((choice) => choice.textContent?.includes(label))
      ?.querySelector('input')
      ?.click();
  };
  const submit = () => {
    el.querySelector('form')?.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  };
  const errorText = (id: string) => el.querySelector(`#${id}-error`)?.textContent?.trim();
  const respond = (status: number, body: object) => {
    backend.expectOne(URL).flush(body, { status, statusText: String(status) });
    fixture.detectChanges();
  };
  return {
    el,
    control,
    type,
    fillValid,
    chooseLanguage,
    submit,
    errorText,
    respond,
    navigate,
    backend,
    fixture,
  };
}

describe('RegisterComponent', () => {
  afterEach(() => {
    document.documentElement.lang = 'en';
  });

  it('BB01 — a blank email is blocked client-side and nothing is sent', () => {
    const { backend, fillValid, type, submit, errorText } = setup();
    fillValid('');
    type('email', '');
    submit();
    backend.expectNone(URL);
    expect(errorText('email')).toBe('Enter your email address.');
  });

  it('blocks an invalid email format', () => {
    const { backend, fillValid, submit, errorText } = setup();
    fillValid('not-an-email');
    submit();
    backend.expectNone(URL);
    expect(errorText('email')).toBe('Enter a valid email address.');
  });

  it('blocks a weak password and ticks the rules live', () => {
    const { el, backend, fillValid, type, submit, errorText, fixture } = setup();
    fillValid();
    type('password', 'abcdefgh');
    type('confirmPassword', 'abcdefgh');
    fixture.detectChanges();
    submit();
    backend.expectNone(URL);
    expect(errorText('password')).toBe('Password does not meet the rules.');
    const met = Array.from(el.querySelectorAll('.rules li')).map((li) =>
      li.classList.contains('met'),
    );
    expect(met).toEqual([true, true, false]); // length ok, has a letter, no number
  });

  it('blocks mismatched passwords', () => {
    const { backend, fillValid, type, submit, errorText } = setup();
    fillValid();
    type('confirmPassword', 'Different123');
    submit();
    backend.expectNone(URL);
    expect(errorText('confirmPassword')).toBe('Passwords do not match.');
  });

  it('BB02 — a duplicate email shows the 409 message on Email and keeps everything but the passwords', () => {
    const { control, fillValid, submit, respond, errorText, navigate } = setup();
    fillValid();
    submit();
    respond(409, { error: { code: 'CONFLICT', message: 'Email already registered' } });
    expect(errorText('email')).toBe('An account with this email already exists.');
    expect(control('#name').value).toBe(' Nimal ');
    expect(control('#email').value).toBe('Nimal@Example.com');
    expect(control('#password').value).toBe('');
    expect(control('#confirmPassword').value).toBe('');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('maps server fieldErrors onto their fields', () => {
    const { fillValid, submit, respond, errorText } = setup();
    fillValid();
    submit();
    respond(400, {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request failed validation',
        details: { fieldErrors: { name: ['Name is taken'] } },
      },
    });
    expect(errorText('name')).toBe('Name is taken');
  });

  it('on success sends a clean payload, starts the session, applies the language and redirects', () => {
    const { fillValid, chooseLanguage, submit, navigate, backend } = setup();
    fillValid();
    chooseLanguage('සිංහල');
    submit();
    const req = backend.expectOne(URL);
    expect(req.request.body).toEqual({
      name: 'Nimal',
      email: 'nimal@example.com',
      password: 'Password123',
      language: 'si',
    });
    req.flush({ token: 'jwt', user: customer });
    expect(TestBed.inject(SessionStore).isAuthenticated()).toBeTrue();
    expect(document.documentElement.lang).toBe('si');
    expect(navigate).toHaveBeenCalledWith('/');
  });

  it('toggles password visibility with aria-pressed', () => {
    const { el, control, fixture } = setup();
    const toggle = el.querySelector<HTMLButtonElement>('button[aria-pressed]');
    expect(toggle?.getAttribute('aria-pressed')).toBe('false');
    expect(control('#password').type).toBe('password');
    toggle?.click();
    fixture.detectChanges();
    expect(toggle?.getAttribute('aria-pressed')).toBe('true');
    expect(control('#password').type).toBe('text');
  });
});
