import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
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
  template: `
    <nav class="app-bar" aria-label="Primary">
      <a class="logo" routerLink="/">Ruchi</a>
      <app-city-selector />
      <app-search-input />
      <ul>
        @for (item of items; track item.path) {
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
      </ul>
      <app-language-switcher />
    </nav>
  `,
})
export class TopNavComponent {
  protected readonly items = NAV_ITEMS;
}
