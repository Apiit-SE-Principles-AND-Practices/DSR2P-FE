import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import type { ApiError } from '../../core/api.interceptor';
import { postLoginPath } from '../../core/return-to';
import { SessionStore } from '../../core/session.store';
import { FormErrorComponent } from '../../shared/form-error.component';

// Never say which of the two was wrong: no user enumeration.
const ERRORS: Record<number, string> = {
  401: 'Email or password is incorrect.',
  429: 'Too many attempts, try again shortly.',
};

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, FormErrorComponent],
  styleUrl: './login.component.css',
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
              <path d="M18 8h1a4 4 0 0 1 0 8h-1"></path>
              <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path>
              <line x1="6" y1="1" x2="6" y2="4"></line>
              <line x1="10" y1="1" x2="10" y2="4"></line>
              <line x1="14" y1="1" x2="14" y2="4"></line>
            </svg>
          </div>
          <h1 class="auth-title">Welcome back</h1>
          <p class="auth-subtitle">Log in to explore and review Sri Lankan dining</p>
        </header>

        @if (returnTo) {
          <div class="return-notice" role="status">
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
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
            <span>Please sign in to continue to your destination</span>
          </div>
        }

        <form class="auth-form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <app-form-error [message]="error()" />

          <div class="field">
            <label class="field-label" for="login-email">Email</label>
            <div class="input-container">
              <span class="input-icon" aria-hidden="true">
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
              </span>
              <input
                id="login-email"
                type="email"
                formControlName="email"
                autocomplete="username"
                placeholder="name@example.com"
                [attr.aria-invalid]="invalid('email')"
                [attr.aria-describedby]="invalid('email') ? 'email-error' : null"
              />
            </div>
            @if (invalid('email')) {
              <span id="email-error" class="field-error">
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
                Enter a valid email address.
              </span>
            }
          </div>

          <div class="field">
            <label class="field-label" for="login-password">Password</label>
            <div class="input-container with-toggle">
              <span class="input-icon" aria-hidden="true">
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
              </span>
              <input
                id="login-password"
                [type]="showPassword() ? 'text' : 'password'"
                formControlName="password"
                autocomplete="current-password"
                placeholder="••••••••"
                [attr.aria-invalid]="invalid('password')"
                [attr.aria-describedby]="invalid('password') ? 'password-error' : null"
              />
              <button
                type="button"
                class="toggle-password-btn"
                [attr.aria-label]="showPassword() ? 'Hide password' : 'Show password'"
                [attr.aria-pressed]="showPassword()"
                (click)="showPassword.set(!showPassword())"
              >
                @if (showPassword()) {
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
                    <path
                      d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"
                    ></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
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
                    aria-hidden="true"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                }
              </button>
            </div>
            @if (invalid('password')) {
              <span id="password-error" class="field-error">
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
                Enter your password.
              </span>
            }
          </div>

          <button class="btn submit-btn" type="submit" [disabled]="busy()">
            @if (busy()) {
              <span class="btn-spinner" aria-hidden="true"></span>
              <span>Logging in…</span>
            } @else {
              <span>Log in</span>
            }
          </button>
        </form>

        <div class="auth-divider">
          <span>New to Dine Score?</span>
        </div>

        <div class="register-section">
          <a
            class="btn secondary register-btn"
            routerLink="/register"
            [queryParams]="returnTo ? { returnTo } : null"
          >
            Create an account
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
            <rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
          <span>Secure authentication & privacy protection</span>
        </div>
      </div>
    </div>
  `,
})
export class LoginComponent {
  private readonly session = inject(SessionStore);
  private readonly router = inject(Router);
  protected readonly returnTo = inject(ActivatedRoute).snapshot.queryParamMap.get('returnTo');

  protected readonly form = inject(NonNullableFormBuilder).group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });
  protected readonly error = signal('');
  protected readonly busy = signal(false);
  protected readonly showPassword = signal(false);

  protected invalid(field: 'email' | 'password'): boolean {
    const control = this.form.controls[field];
    return control.invalid && control.touched;
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { email, password } = this.form.getRawValue();
    this.busy.set(true);
    this.error.set('');
    this.session
      .login({ email: email.trim(), password })
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
          this.error.set(ERRORS[e.status] ?? e.message);
        },
      });
  }
}
