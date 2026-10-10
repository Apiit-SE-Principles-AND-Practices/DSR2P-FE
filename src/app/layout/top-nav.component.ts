import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { SessionStore } from '../core/session.store';
import { CitySelectorComponent } from '../shared/city-selector.component';
import { LanguageSwitcherComponent } from '../shared/language-switcher.component';
import { SearchInputComponent } from '../shared/search-input.component';
import { NAV_ITEMS } from './nav-items';

@Component({
  selector: 'app-top-nav',
  imports: [
    RouterLink,
    RouterLinkActive,
    CitySelectorComponent,
    LanguageSwitcherComponent,
    SearchInputComponent,
  ],
  styleUrl: './top-nav.component.css',
  host: {
    '(document:click)': 'onDocumentClick($event)',
    '(document:keydown.escape)': 'menuOpen.set(false)',
  },
  template: `
    <nav class="top-bar app-bar" aria-label="Primary">
      <div class="brand-section">
        <a class="logo logo-text" routerLink="/">Dine Score</a>
        <app-city-selector />
      </div>
      <div class="search-section">
        <app-search-input />
      </div>
      <ul class="nav-links">
        <app-language-switcher />
        @for (item of items(); track item.path) {
          <li>
            <a
              class="nav-link"
              [routerLink]="item.path"
              routerLinkActive="active"
              ariaCurrentWhenActive="page"
              [routerLinkActiveOptions]="{ exact: true }"
              >{{ item.label }}</a
            >
          </li>
        }
        @if (session.user(); as user) {
          <li class="user-menu">
            <button
              type="button"
              class="nav-link user-button"
              aria-haspopup="menu"
              [attr.aria-expanded]="menuOpen()"
              (click)="menuOpen.set(!menuOpen())"
            >
              {{ user.name }}
            </button>
            @if (menuOpen()) {
              <div class="user-dropdown" role="menu">
                <!-- <li>
                  <a
                      class="nav-link"
                      [routerLink]="'/account'"
                      routerLinkActive="active"
                      ariaCurrentWhenActive="page"
                      [routerLinkActiveOptions]="{ exact: true }">
                      Account
                    </a>
                </li> -->
                <button
                  type="button"
                  class="logout-button"
                  role="menuitem"
                  [routerLink]="'/account'"
                >
                  Account
                </button>
                <button type="button" class="logout-button" role="menuitem" (click)="logout()">
                  Logout
                </button>
              </div>
            }
          </li>
        }
      </ul>
    </nav>
  `,
})
export class TopNavComponent {
  protected readonly session = inject(SessionStore);
  private readonly router = inject(Router);
  protected readonly menuOpen = signal(false);

  /** The Login link gives way to the user's name once signed in. */
  protected readonly items = computed(() =>
    this.session.isAuthenticated() ? NAV_ITEMS.filter((item) => item.path !== '/login') : NAV_ITEMS,
  );

  protected onDocumentClick(event: Event): void {
    if (!(event.target as Element).closest('.user-menu')) this.menuOpen.set(false);
  }

  protected logout(): void {
    this.menuOpen.set(false);
    this.session.logout();
    void this.router.navigate(['/']);
  }
}
