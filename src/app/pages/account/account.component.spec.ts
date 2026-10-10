import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { apiInterceptor } from '../../core/api.interceptor';
import { setUiLanguage } from '../../core/languages';
import { SessionStore, type PublicUser, type Role } from '../../core/session.store';
import { ToastService } from '../../shared/toast.service';
import { AccountComponent } from './account.component';

const ann = (role: Role = 'Customer'): PublicUser => ({
  id: 'u1',
  name: 'Ann Perera',
  email: 'ann@example.com',
  role,
  language: 'en',
});

function setup(role: Role = 'Customer') {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      provideHttpClient(withInterceptors([apiInterceptor])),
      provideHttpClientTesting(),
    ],
  });
  TestBed.inject(SessionStore).start({ token: 't', user: ann(role) });
  const backend = TestBed.inject(HttpTestingController);
  const fixture = TestBed.createComponent(AccountComponent);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const input = el.querySelector<HTMLInputElement>('#name');
  if (!input) throw new Error('No name input');
  const saveButton = () => {
    const found = el.querySelector<HTMLButtonElement>('button[type=submit]');
    if (!found) throw new Error('No Save button');
    return found;
  };
  const type = (value: string) => {
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };
  const submit = () => {
    el.querySelector('form')?.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  };
  const request = () => backend.expectOne((r) => r.url.endsWith('/users/me'));
  return { el, fixture, input, saveButton, type, submit, request, backend };
}

describe('AccountComponent', () => {
  afterEach(() => {
    localStorage.removeItem('language');
    setUiLanguage('en');
    localStorage.removeItem('language');
  });

  it('shows the name to edit, the email as read-only text, and the language switcher', () => {
    const { el, input } = setup();
    expect(input.value).toBe('Ann Perera');
    expect(el.textContent).toContain('ann@example.com');
    expect(el.querySelector('input[type=email], input[value="ann@example.com"]')).toBeNull(); // not editable
    expect(el.querySelectorAll('app-language-switcher button').length).toBe(3);
  });

  it('links a Customer to their reviews and to their data', () => {
    const hrefs = Array.from(setup().el.querySelectorAll('ul a')).map((a) =>
      a.getAttribute('href'),
    );
    expect(hrefs).toEqual(['/account/reviews', '/account/data']);
  });

  it('does not offer "My reviews" to an Admin, who writes none', () => {
    const hrefs = Array.from(setup('Admin').el.querySelectorAll('ul a')).map((a) =>
      a.getAttribute('href'),
    );
    expect(hrefs).toEqual(['/account/data']);
  });

  describe('Save', () => {
    it('is disabled until the name has been changed', () => {
      const { saveButton, type } = setup();
      expect(saveButton().disabled).toBeTrue();
      type('Ann Silva');
      expect(saveButton().disabled).toBeFalse();
      type('Ann Perera'); // back to the saved value
      expect(saveButton().disabled).toBeTrue();
    });

    it('sends only the trimmed name, then shows a success toast and the saved name', () => {
      const { fixture, saveButton, type, submit, request } = setup();
      type('  Ann Silva  ');
      submit();
      const req = request();
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ name: 'Ann Silva' });
      req.flush({ ...ann(), name: 'Ann Silva' });
      fixture.detectChanges();

      expect(TestBed.inject(SessionStore).user()?.name).toBe('Ann Silva');
      expect(
        TestBed.inject(ToastService)
          .toasts()
          .map((t) => t.message),
      ).toEqual(['Profile saved.']);
      expect(saveButton().disabled).toBeTrue(); // nothing left to save
    });

    it('does not send twice while saving', () => {
      const { saveButton, type, submit, request } = setup();
      type('Ann Silva');
      submit();
      expect(saveButton().disabled).toBeTrue();
      submit();
      request(); // exactly one request exists (expectOne would fail on two)
    });
  });

  describe('name validation', () => {
    it('blocks a blank name with a message, and sends nothing', () => {
      const { el, saveButton, type, submit, backend } = setup();
      type('   ');
      expect(saveButton().disabled).toBeTrue();
      expect(el.querySelector('#name-error')?.textContent?.trim()).toBe('Enter your name.');
      submit();
      backend.expectNone(() => true);
    });

    it('blocks a name over 100 characters', () => {
      const { el, saveButton, type } = setup();
      type('a'.repeat(101));
      expect(saveButton().disabled).toBeTrue();
      expect(el.querySelector('#name-error')?.textContent?.trim()).toBe(
        'Use 100 characters or fewer.',
      );
    });

    it('accepts exactly 100 characters', () => {
      const { saveButton, type } = setup();
      type('a'.repeat(100));
      expect(saveButton().disabled).toBeFalse();
    });
  });

  describe('when saving fails', () => {
    it('keeps what was typed, explains, and does not change the signed-in user', () => {
      const { el, input, type, submit, request, fixture } = setup();
      type('Ann Silva');
      submit();
      request().flush(
        { error: { code: 'INTERNAL_ERROR', message: 'Server error.' } },
        { status: 500, statusText: 'x' },
      );
      fixture.detectChanges();
      expect(el.querySelector('[role=alert]')?.textContent).toContain(
        'We couldn’t save your profile.',
      );
      expect(input.value).toBe('Ann Silva');
      expect(TestBed.inject(SessionStore).user()?.name).toBe('Ann Perera');
      expect(TestBed.inject(ToastService).toasts().length).toBe(0);
    });

    it('shows the server’s own message next to the name, until it is edited again', () => {
      const { el, type, submit, request, fixture } = setup();
      type('Ann Silva');
      submit();
      request().flush(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Request failed validation',
            details: { fieldErrors: { name: ['Name must be at most 100 characters'] } },
          },
        },
        { status: 400, statusText: 'x' },
      );
      fixture.detectChanges();
      expect(el.querySelector('#name-error')?.textContent?.trim()).toBe(
        'Name must be at most 100 characters',
      );
      type('Ann Silvia');
      expect(el.querySelector('#name-error')).toBeNull();
    });
  });
});
