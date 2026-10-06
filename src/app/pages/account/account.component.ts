import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import type { ApiError } from '../../core/api.interceptor';
import { ProfileService } from '../../core/profile.service';
import { SessionStore } from '../../core/session.store';
import { FormErrorComponent } from '../../shared/form-error.component';
import { LanguageSwitcherComponent } from '../../shared/language-switcher.component';
import { ToastService } from '../../shared/toast.service';
import { profileSchema } from '../../shared/validation/profile.schema';

/** The signed-in user's profile: name, email (read-only), language, and links to their own content. */
@Component({
  selector: 'app-account',
  imports: [FormErrorComponent, LanguageSwitcherComponent, RouterLink],
  template: `
    <h1>My account</h1>
    @if (user(); as u) {
      <form (submit)="$event.preventDefault(); save()" novalidate>
        <app-form-error [message]="error()" />

        <div class="field">
          <label for="name">Name</label>
          <input
            id="name"
            autocomplete="name"
            [attr.aria-invalid]="!!message()"
            [attr.aria-describedby]="message() ? 'name-error' : null"
            [value]="name()"
            #box
            (input)="edit(box.value)"
          />
          @if (message(); as text) {
            <span id="name-error" class="field-error">{{ text }}</span>
          }
        </div>

        <p><strong>Email</strong><br />{{ u.email }}</p>

        <button class="btn" type="submit" [disabled]="busy() || !dirty() || !valid()">
          {{ busy() ? 'Saving…' : 'Save changes' }}
        </button>
      </form>

      <h2>Language</h2>
      <app-language-switcher />

      <h2>Your content</h2>
      <ul>
        @if (u.role === 'Customer') {
          <li><a routerLink="/account/reviews">My reviews and replies</a></li>
        }
        <li><a routerLink="/account/data">My data</a></li>
      </ul>
    }
  `,
})
export class AccountComponent {
  private readonly profile = inject(ProfileService);
  private readonly toast = inject(ToastService);
  protected readonly user = inject(SessionStore).user;

  protected readonly name = signal(this.user()?.name ?? '');
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  private readonly serverError = signal('');

  private readonly result = computed(() => profileSchema.safeParse({ name: this.name() }));
  protected readonly valid = computed(() => this.result().success);
  /** Save is only offered when the name differs from the saved one. */
  protected readonly dirty = computed(() => this.name().trim() !== this.user()?.name);
  /** The server's message first; the schema's only once the name has been changed. */
  protected readonly message = computed(() => {
    const result = this.result();
    return (
      this.serverError() || (this.dirty() && !result.success ? result.error.issues[0].message : '')
    );
  });

  /** Typing again clears the server's complaint about the old value. */
  protected edit(value: string): void {
    this.name.set(value);
    this.serverError.set('');
  }

  protected save(): void {
    const result = this.result();
    if (!result.success || !this.dirty() || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.serverError.set('');
    this.profile
      .update({ name: result.data.name })
      .pipe(
        finalize(() => {
          this.busy.set(false);
        }),
      )
      .subscribe({
        next: () => {
          this.name.set(result.data.name); // shows what was saved (trimmed)
          this.toast.show('Profile saved.', 'success');
        },
        error: (e: ApiError) => {
          this.serverError.set(e.fieldErrors?.['name'] ?? '');
          this.error.set(
            `We couldn’t save your profile. ${e.message} Your changes are still here.`,
          );
        },
      });
  }
}
