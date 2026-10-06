import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, type Observable } from 'rxjs';
import type { Category } from './category.service';
import { DEFAULT_SORT, toQuery, type PriceBand, type SearchParams } from './search-params.service';

/** Mirrors the OpenAPI `RestaurantSearchResult`. */
export interface SearchResult {
  id: string;
  name: string;
  city: string;
  address: string;
  imageUrl: string | null;
  categories: Category[];
  averageRating: number | null;
  priceBand: PriceBand | null;
}

export interface SearchPage {
  data: SearchResult[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export const PAGE_SIZE = 12;
const MAX_PAGE_SIZE = 100; // the backend's limit

@Injectable({ providedIn: 'root' })
export class SearchService {
  private readonly http = inject(HttpClient);

  /** Restaurants for the given search. The city defaults to the selected one (see the API interceptor). */
  search({ q, ...filters }: SearchParams): Observable<SearchPage> {
    const get = (page: number, pageSize: number) =>
      this.http.get<SearchPage>('/restaurants/search', {
        params: { ...toQuery({ ...filters, sort: filters.sort ?? DEFAULT_SORT, page }), pageSize },
      });
    if (!q) return get(filters.page, PAGE_SIZE);

    // TEMPORARY: the backend has no name search yet. Fetch every match (up to its 100 limit) and
    // filter and paginate here. Once it accepts `q`, send it above and delete this branch.
    return get(1, MAX_PAGE_SIZE).pipe(
      map(({ data }) => {
        const matches = data.filter(({ name }) => name.toLowerCase().includes(q.toLowerCase()));
        const start = (filters.page - 1) * PAGE_SIZE;
        return {
          data: matches.slice(start, start + PAGE_SIZE),
          page: filters.page,
          pageSize: PAGE_SIZE,
          total: matches.length,
          totalPages: Math.ceil(matches.length / PAGE_SIZE),
        };
      }),
    );
  }
}
