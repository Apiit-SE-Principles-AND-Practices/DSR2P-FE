import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CitySelectorComponent } from '../shared/city-selector.component';
import { SearchInputComponent } from '../shared/search-input.component';

/** Top bar below 640px (the tab bar carries the links): logo and city selector, search joins in 10.1. */
@Component({
  selector: 'app-mobile-header',
  imports: [RouterLink, CitySelectorComponent, SearchInputComponent],
  template: `
    <header class="app-bar">
      <a class="logo" routerLink="/">Dine Score</a>
      <app-city-selector />
      <app-search-input />
    </header>
  `,
})
export class MobileHeaderComponent {}
