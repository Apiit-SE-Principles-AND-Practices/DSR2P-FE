import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import type { ApiError } from '../../core/api.interceptor';
import { LANGUAGES, uiLanguage } from '../../core/languages';
import { postLoginPath, safeReturnTo } from '../../core/return-to';
import { SessionStore } from '../../core/session.store';
import { FormErrorComponent } from '../../shared/form-error.component';
import { PasswordRulesComponent } from '../../shared/password-rules.component';
import { registerSchema } from '../../shared/validation/register.schema';
import { fieldError, zodValidator } from '../../shared/validation/zod-validator';

const FIELDS = [
  {
    key: 'name',
    label: 'Name',
    type: 'text',
    autocomplete: 'name',
    placeholder: 'Your full name',
  },
  {
    key: 'email',
    label: 'Email',
    type: 'email',
    autocomplete: 'email',
    placeholder: 'name@example.com',
  },
  {
    key: 'password',
    label: 'Password',
    type: 'password',
    autocomplete: 'new-password',
    placeholder: 'At least 8 characters',
  },
  {
    key: 'confirmPassword',
    label: 'Confirm password',
    type: 'password',
    autocomplete: 'new-password',
    placeholder: 'Re-enter your password',
  },
] as const;

type FieldKey = (typeof FIELDS)[number]['key'] | 'language';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink, FormErrorComponent, PasswordRulesComponent],
  styleUrl: './register.component.css',
  template: `
    <div class="auth-page">
      <div class="auth-card">
        <header class="auth-header">
          <div class="brand-badge" aria-hidden="true">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <line x1="19" y1="8" x2="19" y2="14"></line>
              <line x1="22" y1="11" x2="16" y2="11"></line>
            </svg>
          </div>
          <h1 class="auth-title">Create an account</h1>
          <p class="auth-subtitle">
            Join Dine Score to explore and review authentic Sri Lankan cuisine
          </p>
        </header>

        <form class="auth-form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <app-form-error [message]="error()" />

          @for (f of fields; track f.key) {
            <div class="field">
              <label class="field-label" [for]="f.key">{{ f.label }}</label>
              <div class="input-container">
                <span class="input-icon" aria-hidden="true">
                  @if (f.key === 'name') {
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                  } @else if (f.key === 'email') {
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <rect width="20" height="16" x="2" y="4" rx="2"></rect>
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
                    </svg>
                  } @else {
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                  }
                </span>
                <input
                  [id]="f.key"
                  [formControlName]="f.key"
                  [type]="f.type === 'password' && showPassword() ? 'text' : f.type"
                  [autocomplete]="f.autocomplete"
                  [placeholder]="f.placeholder"
                  [attr.aria-invalid]="!!message(f.key)"
                  [attr.aria-describedby]="describedBy(f.key)"
                />
              </div>
              @if (message(f.key); as text) {
                <span class="field-error" [id]="f.key + '-error'">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                  {{ text }}
                </span>
              }
              @if (f.key === 'password') {
                <app-password-rules id="password-rules" [password]="form.controls.password.value" />
              }
            </div>
          }

          <button
            type="button"
            class="btn secondary toggle-password-btn"
            [attr.aria-pressed]="showPassword()"
            (click)="showPassword.set(!showPassword())"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              @if (showPassword()) {
                <path
                  d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"
                ></path>
                <line x1="1" y1="1" x2="23" y2="23"></line>
              } @else {
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              }
            </svg>
            <span>{{ showPassword() ? 'Hide passwords' : 'Show passwords' }}</span>
          </button>

          <fieldset class="field language-fieldset">
            <legend class="language-legend">Preferred language</legend>
            <div class="language-choices">
              @for (l of languages; track l.code) {
                <label class="choice">
                  <input type="radio" formControlName="language" [value]="l.code" />
                  <span [lang]="l.code">{{ l.label }}</span>
                </label>
              }
            </div>
          </fieldset>

          <button class="btn submit-btn" type="submit" [disabled]="busy()">
            @if (busy()) {
              <span class="btn-spinner" aria-hidden="true"></span>
              <span>Creating account…</span>
            } @else {
              <span>Create account</span>
            }
          </button>
        </form>

        <div class="auth-divider">
          <span>Already registered?</span>
        </div>

        <div class="login-section">
          <a
            class="btn secondary login-btn"
            routerLink="/login"
            [queryParams]="returnTo ? { returnTo } : null"
          >
            Log in
          </a>
        </div>

        <div class="auth-footer-trust">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
          </svg>
          <span>Your privacy and data are protected</span>
        </div>
      </div>
    </div>
  `,
})
export class RegisterComponent {
  private readonly session = inject(SessionStore);
  private readonly router = inject(Router);
  protected readonly returnTo = safeReturnTo(
    inject(ActivatedRoute).snapshot.queryParamMap.get('returnTo'),
  );

  protected readonly fields = FIELDS;
  protected readonly languages = LANGUAGES;
  protected readonly form = inject(NonNullableFormBuilder).group(
    { name: '', email: '', password: '', confirmPassword: '', language: uiLanguage() },
    { validators: zodValidator(registerSchema) },
  );
  protected readonly serverErrors = signal<Partial<Record<string, string>>>({});
  protected readonly error = signal('');
  protected readonly busy = signal(false);
  protected readonly showPassword = signal(false);

  constructor() {
    // Editing anything dismisses the server's field errors; the next submit re-checks them.
    this.form.valueChanges.pipe(takeUntilDestroyed(inject(DestroyRef))).subscribe(() => {
      this.serverErrors.set({});
    });
  }

  /** Server error first, then the shared schema's message once the field has been visited. */
  protected message(key: FieldKey): string | undefined {
    return (
      this.serverErrors()[key] ??
      (this.form.controls[key].touched ? fieldError(this.form, key) : undefined)
    );
  }

  protected describedBy(key: FieldKey): string | null {
    const ids = [key === 'password' && 'password-rules', this.message(key) && `${key}-error`];
    return ids.filter(Boolean).join(' ') || null;
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { name, email, password, language } = this.form.getRawValue();
    this.busy.set(true);
    this.error.set('');
    this.session
      .register({ name: name.trim(), email: email.trim().toLowerCase(), password, language })
      .pipe(
        finalize(() => {
          this.busy.set(false);
        }),
      )
      .subscribe({
        next: ({ role }) => {
          void this.router.navigateByUrl(postLoginPath(role, this.returnTo));
        },
        error: (e: ApiError) => {
          this.form.controls.password.reset();
          this.form.controls.confirmPassword.reset();
          if (e.status === 409) {
            this.serverErrors.set({ email: 'An account with this email already exists.' });
          } else if (e.fieldErrors) {
            this.serverErrors.set(e.fieldErrors);
          } else {
            this.error.set(e.message);
          }
        },
      });
  }
}
