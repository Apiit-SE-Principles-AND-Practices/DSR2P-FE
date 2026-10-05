import { Component, inject } from '@angular/core';
import { AppStore } from '../core/app.store';
import { CITIES } from '../core/search-params.service';

/** City picker shown in both headers. Compact visually; the accessible name is the full word. */
@Component({
  selector: 'app-city-selector',
  template: `
    <select class="select" aria-label="City" (change)="pick(city.value)" #city>
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
