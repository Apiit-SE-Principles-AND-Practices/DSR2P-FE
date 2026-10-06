import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { SearchService, type SearchPage, type SearchResult } from './search.service';
import type { SearchParams } from './search-params.service';

const restaurant = (name: string): SearchResult => ({
  id: name,
  name,
  city: 'Colombo',
  address: '',
  imageUrl: null,
  categories: [],
  averageRating: null,
  priceBand: null,
});
const page = (...names: string[]): SearchPage => ({
  data: names.map(restaurant),
  page: 1,
  pageSize: 100,
  total: names.length,
  totalPages: 1,
});

describe('SearchService', () => {
  let service: SearchService;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(SearchService);
    backend = TestBed.inject(HttpTestingController);
  });

  /** Runs a search and answers the single request it makes. */
  function run(params: Partial<SearchParams>, response: SearchPage) {
    let result: SearchPage | undefined;
    service.search({ page: 1, ...params }).subscribe((p) => (result = p));
    const request = backend.expectOne((req) => req.url.endsWith('/restaurants/search'));
    request.flush(response);
    return { request: request.request, result };
  }

  it('without a name, asks the server for the page with the filters', () => {
    const { request } = run({ diet: 'Halal', page: 2 }, page());
    expect(request.params.get('diet')).toBe('Halal');
    expect(request.params.get('page')).toBe('2');
    expect(request.params.get('pageSize')).toBe('12');
    expect(request.params.has('q')).toBeFalse();
  });

  it('sorts by rating unless the search says otherwise', () => {
    expect(run({}, page()).request.params.get('sort')).toBe('rating');
  });

  it('sends the chosen sort', () => {
    expect(run({ sort: 'price' }, page()).request.params.get('sort')).toBe('price');
  });

  it('BB05 — with a name, keeps only matching restaurants (case-insensitive)', () => {
    const { request, result } = run(
      { q: 'KOTTU', city: 'Kandy' },
      page('Kandy Kottu Corner', 'Sea Spray', 'Best Kottu'),
    );
    expect(request.params.get('pageSize')).toBe('100'); // everything in the city, filtered here
    expect(request.params.get('city')).toBe('Kandy');
    expect(request.params.has('q')).toBeFalse();
    expect(result?.data.map((r) => r.name)).toEqual(['Kandy Kottu Corner', 'Best Kottu']);
    expect(result).toEqual(jasmine.objectContaining({ total: 2, totalPages: 1, page: 1 }));
  });

  it('paginates name matches locally', () => {
    const names = Array.from({ length: 14 }, (_, i) => `Kottu ${String(i)}`);
    const { result } = run({ q: 'kottu', page: 2 }, page(...names, 'Other'));
    expect(result?.data.length).toBe(2);
    expect(result).toEqual(jasmine.objectContaining({ page: 2, total: 14, totalPages: 2 }));
  });

  it('returns an empty page when nothing matches', () => {
    const { result } = run({ q: 'pizza' }, page('Sea Spray'));
    expect(result).toEqual(jasmine.objectContaining({ data: [], total: 0, totalPages: 0 }));
  });
});
