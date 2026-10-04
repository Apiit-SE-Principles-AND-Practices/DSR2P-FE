import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NAV_ITEMS } from './nav-items';

@Component({
  selector: 'app-bottom-tab-bar',
  imports: [RouterLink, RouterLinkActive],
  styleUrl: './bottom-tab-bar.component.css',
  template: `
    <nav aria-label="Primary">
      @for (item of items; track item.path) {
        <a
          class="nav-link"
          [routerLink]="item.path"
          routerLinkActive="active"
          ariaCurrentWhenActive="page"
          [routerLinkActiveOptions]="{ exact: true }"
          >{{ item.label }}</a
        >
      }
    </nav>
  `,
})
export class BottomTabBarComponent {
  protected readonly items = NAV_ITEMS;
}
