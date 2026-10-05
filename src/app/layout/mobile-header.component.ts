import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CitySelectorComponent } from '../shared/city-selector.component';

/** Top bar below 640px (the tab bar carries the links): logo and city selector, search joins in 10.1. */
@Component({
  selector: 'app-mobile-header',
  imports: [RouterLink, CitySelectorComponent],
  template: `
    <header class="app-bar">
      <a class="logo" routerLink="/">Ruchi</a>
      <app-city-selector />
    </header>
  `,
})
export class MobileHeaderComponent {}
