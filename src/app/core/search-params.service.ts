import { computed, inject, Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, type ParamMap } from '@angular/router';

// Values match the backend's `/restaurants/search` parameters, so the URL can be passed through as-is.
export const CITIES = ['Colombo', 'Kandy', 'Galle'] as const;
export const DIETS = ['Vegetarian', 'Vegan', 'Halal'] as const;
export const SPICE_LEVELS = ['None', 'Mild', 'Medium', 'Hot', 'Extra_Hot'] as const;
export const PRICE_BANDS = ['Budget', 'Moderate', 'Premium'] as const;
export const SORTS = ['rating', 'price'] as const;

/** Shown when the URL has no `sort`; the backend itself would list newest first. */
export const DEFAULT_SORT = 'rating' satisfies (typeof SORTS)[number];

export type PriceBand = (typeof PRICE_BANDS)[number];

export interface SearchParams {
  city?: (typeof CITIES)[number];
  /** Name search text. */
  q?: string;
  /** Restaurant category id (from GET /categories); an unknown id simply matches nothing. */
  categoryId?: number;
  diet?: (typeof DIETS)[number];
  spice?: (typeof SPICE_LEVELS)[number];
  price?: PriceBand;
  sort?: (typeof SORTS)[number];
  page: number;
}

/** The filter fields (the name search is separate). */
export const FILTER_KEYS = ['categoryId', 'diet', 'spice', 'price'] as const;

/** A patch that removes every filter. */
export const CLEARED_FILTERS = Object.fromEntries(
  FILTER_KEYS.map((key) => [key, undefined]),
) as Partial<SearchParams>;

/** The listed value if `value` is one of them, else undefined (so bad URLs fall back to defaults). */
const oneOf = <T extends string>(allowed: readonly T[], value: string | null) =>
  allowed.find((item) => item === value);

/** Trimmed text, with blank treated as absent. */
const text = (value: string | null): string | undefined => {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : undefined;
};

const positiveInt = (value: string | null): number | undefined => {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : undefined;
};

function parse(query: ParamMap): SearchParams {
  return {
    city: oneOf(CITIES, query.get('city')),
    q: text(query.get('q')),
    categoryId: positiveInt(query.get('categoryId')),
    diet: oneOf(DIETS, query.get('diet')),
    spice: oneOf(SPICE_LEVELS, query.get('spice')),
    price: oneOf(PRICE_BANDS, query.get('price')),
    sort: oneOf(SORTS, query.get('sort')),
    page: positiveInt(query.get('page')) ?? 1,
  };
}

/** Query-string object for a router link or navigation: empty values and page 1 are left out. */
export const toQuery = (params: SearchParams): Record<string, string | number> =>
  Object.fromEntries(
    Object.entries({ ...params, page: params.page > 1 ? params.page : undefined }).filter(
      ([, value]) => value !== undefined,
    ),
  ) as Record<string, string | number>;

/**
 * The only code that reads or writes the search URL (`/search?city=…&diet=…&sort=…&page=…`).
 * Keeping state in the URL makes results shareable and bookmarkable, and Back/Forward just work.
 */
@Injectable({ providedIn: 'root' })
export class SearchParamsService {
  private readonly router = inject(Router);
  private readonly query = toSignal(inject(ActivatedRoute).queryParamMap, { requireSync: true });

  /** Current, validated search params. */
  readonly params = computed(() => parse(this.query()));

  /**
   * Applies `patch` to the current params and navigates to `/search`. Any change goes back to page 1
   * unless the patch sets `page`. Pass `undefined` to remove a filter. `replaceUrl` keeps live typing
   * from filling the Back history.
   */
  update(patch: Partial<SearchParams>, replaceUrl = false): Promise<boolean> {
    const next = { ...this.params(), page: 1, ...patch };
    return this.router.navigate(['/search'], { queryParams: toQuery(next), replaceUrl });
  }

  /** Removes every filter; the name search, city and sort stay. */
  clearFilters(): Promise<boolean> {
    return this.update(CLEARED_FILTERS);
  }

  /** Removes the name search and every filter; the city and sort stay. */
  reset(): Promise<boolean> {
    return this.update({ ...CLEARED_FILTERS, q: undefined });
  }
}
