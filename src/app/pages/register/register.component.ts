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
  { key: 'name', label: 'Name', type: 'text', autocomplete: 'name' },
  { key: 'email', label: 'Email', type: 'email', autocomplete: 'email' },
  { key: 'password', label: 'Password', type: 'password', autocomplete: 'new-password' },
  {
    key: 'confirmPassword',
    label: 'Confirm password',
    type: 'password',
    autocomplete: 'new-password',
  },
] as const;

type FieldKey = (typeof FIELDS)[number]['key'] | 'language';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink, FormErrorComponent, PasswordRulesComponent],
  template: `
    <h1>Create an account</h1>
    <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <app-form-error [message]="error()" />

      @for (f of fields; track f.key) {
        <div class="field">
          <label [for]="f.key">{{ f.label }}</label>
          <input
            [id]="f.key"
            [formControlName]="f.key"
            [type]="f.type === 'password' && showPassword() ? 'text' : f.type"
            [autocomplete]="f.autocomplete"
            [attr.aria-invalid]="!!message(f.key)"
            [attr.aria-describedby]="describedBy(f.key)"
          />
          @if (message(f.key); as text) {
            <span class="field-error" [id]="f.key + '-error'">{{ text }}</span>
          }
          @if (f.key === 'password') {
            <app-password-rules id="password-rules" [password]="form.controls.password.value" />
          }
        </div>
      }

      <button
        type="button"
        class="btn secondary"
        [attr.aria-pressed]="showPassword()"
        (click)="showPassword.set(!showPassword())"
      >
        {{ showPassword() ? 'Hide passwords' : 'Show passwords' }}
      </button>

      <fieldset class="field">
        <legend>Preferred language</legend>
        @for (l of languages; track l.code) {
          <label class="choice">
            <input type="radio" formControlName="language" [value]="l.code" />
            <span [lang]="l.code">{{ l.label }}</span>
          </label>
        }
      </fieldset>

      <button class="btn" type="submit" [disabled]="busy()">
        {{ busy() ? 'Creating account…' : 'Create account' }}
      </button>
    </form>
    <p>Already registered? <a routerLink="/login">Log in</a></p>
  `,
})
export class RegisterComponent {
  private readonly session = inject(SessionStore);
  private readonly router = inject(Router);
  private readonly returnTo = safeReturnTo(
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
