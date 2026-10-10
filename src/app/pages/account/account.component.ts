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
  styleUrl: './account.component.css',
  template: `
    @if (user(); as u) {
      <div class="account-page">
        <header class="account-header">
          <div class="account-avatar" aria-hidden="true">
            {{ avatarInitial(u.name) }}
          </div>
          <div class="account-title-wrap">
            <h1 class="account-title">My account</h1>
            <div class="account-subtitle">
              <span>{{ u.name }}</span>
              <span class="role-badge">{{ u.role }}</span>
            </div>
          </div>
        </header>

        <section class="account-card" aria-labelledby="profile-info-heading">
          <h2 id="profile-info-heading" class="card-title">Profile details</h2>
          <p class="card-desc">
            Update your display name and view your registered account details.
          </p>

          <form class="profile-form" (submit)="$event.preventDefault(); save()" novalidate>
            <app-form-error [message]="error()" />

            <div class="field">
              <label for="name">Name</label>
              <div class="input-wrapper">
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
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                </span>
                <input
                  id="name"
                  autocomplete="name"
                  [attr.aria-invalid]="!!message()"
                  [attr.aria-describedby]="message() ? 'name-error' : null"
                  [value]="name()"
                  #box
                  (input)="edit(box.value)"
                />
              </div>
              @if (message(); as text) {
                <span id="name-error" class="field-error">
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
            </div>

            <div class="read-only-field">
              <span class="read-only-label">Email address</span>
              <p class="read-only-value">
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
                  <rect width="20" height="16" x="2" y="4" rx="2"></rect>
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
                </svg>
                <span>{{ u.email }}</span>
              </p>
            </div>

            <button class="btn save-btn" type="submit" [disabled]="busy() || !dirty() || !valid()">
              @if (busy()) {
                <span class="btn-spinner" aria-hidden="true"></span>
                <span>Saving…</span>
              } @else {
                <span>Save changes</span>
              }
            </button>
          </form>
        </section>

        <section class="account-card" aria-labelledby="language-heading">
          <h2 id="language-heading" class="card-title">Language</h2>
          <p class="card-desc">Choose your preferred language across the Dine Score platform.</p>
          <app-language-switcher />
        </section>

        <section class="account-card" aria-labelledby="content-heading">
          <h2 id="content-heading" class="card-title">Your content</h2>
          <p class="card-desc">Manage your published reviews, replies, and privacy data.</p>
          <ul class="content-nav-list">
            @if (u.role === 'Customer') {
              <li>
                <a class="content-nav-link" routerLink="/account/reviews">
                  <div class="link-content">
                    <span class="link-icon" aria-hidden="true">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      >
                        <path
                          d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
                        ></path>
                      </svg>
                    </span>
                    <span>My reviews and replies</span>
                  </div>
                  <svg
                    class="chevron-icon"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                  >
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </a>
              </li>
            }
            <li>
              <a class="content-nav-link" routerLink="/account/data">
                <div class="link-content">
                  <span class="link-icon" aria-hidden="true">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                      <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                  </span>
                  <span>My data</span>
                </div>
                <svg
                  class="chevron-icon"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </a>
            </li>
          </ul>
        </section>
      </div>
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

  protected avatarInitial(name: string): string {
    return (name.trim()[0] || 'U').toUpperCase();
  }

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
