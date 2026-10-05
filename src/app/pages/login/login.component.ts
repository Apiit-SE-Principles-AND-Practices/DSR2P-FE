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
  template: `
    <h1>Log in</h1>
    <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <app-form-error [message]="error()" />

      <label class="field">
        Email
        <input
          type="email"
          formControlName="email"
          autocomplete="username"
          [attr.aria-invalid]="invalid('email')"
        />
        @if (invalid('email')) {
          <span class="field-error">Enter a valid email address.</span>
        }
      </label>

      <label class="field">
        Password
        <input
          type="password"
          formControlName="password"
          autocomplete="current-password"
          [attr.aria-invalid]="invalid('password')"
        />
        @if (invalid('password')) {
          <span class="field-error">Enter your password.</span>
        }
      </label>

      <button class="btn" type="submit" [disabled]="busy()">
        {{ busy() ? 'Logging in…' : 'Log in' }}
      </button>
    </form>
    <p>No account? <a routerLink="/register">Register</a></p>
  `,
})
export class LoginComponent {
  private readonly session = inject(SessionStore);
  private readonly router = inject(Router);
  private readonly returnTo = inject(ActivatedRoute).snapshot.queryParamMap.get('returnTo');

  protected readonly form = inject(NonNullableFormBuilder).group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });
  protected readonly error = signal('');
  protected readonly busy = signal(false);

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
