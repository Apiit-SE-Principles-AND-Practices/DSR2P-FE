import { effect, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CITIES, SearchParamsService, type SearchParams } from './search-params.service';

export type City = NonNullable<SearchParams['city']>;

const STORAGE_KEY = 'city';
const DEFAULT_CITY: City = 'Colombo';

function storedCity(): City {
  try {
    return CITIES.find((city) => city === localStorage.getItem(STORAGE_KEY)) ?? DEFAULT_CITY;
  } catch {
    return DEFAULT_CITY; // storage can be blocked (private mode)
  }
}

/** App-wide choices that outlive a page. Today: the selected city, remembered between visits. */
@Injectable({ providedIn: 'root' })
export class AppStore {
  private readonly router = inject(Router);
  private readonly search = inject(SearchParamsService);
  private readonly selected = signal<City>(storedCity());

  /** Every search and browse request is scoped to this city. */
  readonly city = this.selected.asReadonly();

  constructor() {
    // A shared /search link carries its own city, which wins over the remembered one.
    effect(() => {
      const fromUrl = this.search.params().city;
      if (fromUrl) this.remember(fromUrl);
    });
  }

  /** Picks a city; on the results page the URL follows (and goes back to page 1). */
  select(city: City): void {
    this.remember(city);
    if (this.router.url.startsWith('/search')) void this.search.update({ city });
  }

  private remember(city: City): void {
    this.selected.set(city);
    try {
      localStorage.setItem(STORAGE_KEY, city);
    } catch {
      // not persisted; the choice still applies for this visit
    }
  }
}
