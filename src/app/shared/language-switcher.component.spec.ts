import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { setUiLanguage, uiLanguage } from '../core/languages';
import { SessionStore } from '../core/session.store';
import { LanguageSwitcherComponent } from './language-switcher.component';
import { ToastService } from './toast.service';

function setup() {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  const fixture = TestBed.createComponent(LanguageSwitcherComponent);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const buttons = () => Array.from(el.querySelectorAll<HTMLButtonElement>('button'));
  const current = () => buttons().filter((b) => b.getAttribute('aria-current') === 'true');
  const signIn = () => {
    TestBed.inject(SessionStore).start({
      token: 't',
      user: { id: 'u', name: 'Ann', email: 'a@b.lk', role: 'Customer', language: 'en' },
    });
  };
  return { el, fixture, buttons, current, signIn, backend: TestBed.inject(HttpTestingController) };
}

describe('LanguageSwitcherComponent', () => {
  beforeEach(() => {
    setUiLanguage('en');
  });
  afterEach(() => {
    localStorage.removeItem('language');
    setUiLanguage('en');
    localStorage.removeItem('language');
  });

  it('always shows all three options, each in its own script and language', () => {
    const { el, buttons } = setup();
    expect(el.querySelector('[role=group]')?.getAttribute('aria-label')).toBe('Language');
    expect(buttons().map((b) => b.textContent?.trim())).toEqual(['EN', 'සිං', 'த']);
    expect(buttons().map((b) => b.lang)).toEqual(['en', 'si', 'ta']);
    expect(buttons().map((b) => b.getAttribute('aria-label'))).toEqual([
      'English — English',
      'සිංහල — Sinhala',
      'தமிழ் — Tamil',
    ]);
  });

  it('marks only the chosen language with aria-current', () => {
    const { current, buttons, fixture } = setup();
    expect(current().map((b) => b.lang)).toEqual(['en']);
    buttons()[2].click();
    fixture.detectChanges();
    expect(current().map((b) => b.lang)).toEqual(['ta']);
  });

  it('applies the language at once: page language set, and remembered on this device', () => {
    const { buttons } = setup();
    buttons()[1].click();
    expect(uiLanguage()).toBe('si');
    expect(document.documentElement.lang).toBe('si');
    expect(localStorage.getItem('language')).toBe('si');
  });

  it('a Guest sends nothing to the server', () => {
    const { buttons, backend } = setup();
    buttons()[1].click();
    backend.expectNone(() => true);
  });

  it('a signed-in user also saves it to their account', () => {
    const { buttons, signIn, backend } = setup();
    signIn();
    buttons()[2].click();
    const req = backend.expectOne((r) => r.url.endsWith('/users/me'));
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ language: 'ta' });
    req.flush({ id: 'u', name: 'Ann', email: 'a@b.lk', role: 'Customer', language: 'ta' });
    expect(TestBed.inject(SessionStore).user()?.language).toBe('ta');
  });

  it('keeps the language for this visit and says so when saving fails', () => {
    const { buttons, signIn, backend } = setup();
    signIn();
    buttons()[1].click();
    backend
      .expectOne((r) => r.url.endsWith('/users/me'))
      .flush({}, { status: 500, statusText: 'x' });
    expect(uiLanguage()).toBe('si');
    expect(
      TestBed.inject(ToastService)
        .toasts()
        .map((t) => t.message)[0],
    ).toContain('could not save your language choice');
  });

  it('choosing the language already in use does nothing', () => {
    const { buttons, signIn, backend } = setup();
    signIn();
    buttons()[0].click();
    backend.expectNone(() => true);
  });
});
