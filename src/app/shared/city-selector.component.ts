import { Component, inject } from '@angular/core';
import { AppStore } from '../core/app.store';
import { CITIES } from '../core/search-params.service';

/** City picker shown in both headers. Compact visually; the accessible name is the full word. */
@Component({
  selector: 'app-city-selector',
  styles: `
    .city-select {
      height: 40px;
      min-height: 40px;
      padding: 0 var(--space-3);
      border: 1px solid var(--ds-border);
      border-radius: var(--radius-full);
      background: var(--ds-surface-100);
      color: var(--ds-ink);
      font-family: inherit;
      font-size: var(--font-size-label);
      font-weight: var(--font-weight-medium);
      cursor: pointer;
      outline: none;
      transition: all 0.15s ease;
    }
    .city-select:hover {
      background: var(--ds-surface-50);
      border-color: var(--ds-border-strong);
    }
    .city-select:focus {
      border-color: var(--ds-brand-600);
    }
  `,
  template: `
    <select class="city-select select" aria-label="City" (change)="pick(city.value)" #city>
      @for (option of cities; track option) {
        <option [value]="option" [selected]="option === app.city()">{{ option }}</option>
      }
    </select>
  `,
})
export class CitySelectorComponent {
  protected readonly app = inject(AppStore);
  protected readonly cities = CITIES;

  protected pick(value: string): void {
    const city = CITIES.find((c) => c === value);
    if (city) this.app.select(city);
  }
}
