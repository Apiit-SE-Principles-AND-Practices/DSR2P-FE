import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import type { SearchPage, SearchResult } from '../core/search.service';
import { SearchResultsComponent, SKELETON_DELAY_MS } from './search-results.component';

/** The filter bar also loads /categories; these tests only care about the search request. */
const isSearch = (req: { url: string }) => req.url.endsWith('/restaurants/search');

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
const page = (names: string[], extra: Partial<SearchPage> = {}): SearchPage => ({
  data: names.map(restaurant),
  page: 1,
  pageSize: 12,
  total: names.length,
  totalPages: 1,
  ...extra,
});

function setup() {
  localStorage.removeItem('city');
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: '**', children: [] }]),
      provideHttpClient(),
      provideHttpClientTesting(),
    ],
  });
  return { router: TestBed.inject(Router), backend: TestBed.inject(HttpTestingController) };
}

/** Renders and lets the resource issue its request (whenStable would wait on the pending mock request). */
function settle(fixture: ReturnType<typeof TestBed.createComponent<SearchResultsComponent>>) {
  fixture.detectChanges();
  TestBed.flushEffects();
  fixture.detectChanges();
}

async function show(url: string, body: SearchPage | null, status = 200) {
  const { router, backend } = setup();
  await router.navigateByUrl(url);
  const fixture = TestBed.createComponent(SearchResultsComponent);
  settle(fixture);
  backend.expectOne(isSearch).flush(body ?? {}, { status, statusText: 'x' });
  backend
    .match((req) => req.url.endsWith('/categories'))
    .forEach((req) => {
      req.flush([]);
    });
  await fixture.whenStable();
  fixture.detectChanges();
  return { el: fixture.nativeElement as HTMLElement, fixture, router, backend };
}

describe('SearchResultsComponent', () => {
  afterEach(() => {
    localStorage.removeItem('city');
  });

  it('BB05 — lists the restaurants matching the name and announces the count', async () => {
    const { el } = await show('/search?q=kottu', page(['Kandy Kottu Corner', 'Sea Spray']));
    expect(Array.from(el.querySelectorAll('a.card .name')).map((n) => n.textContent)).toEqual([
      'Kandy Kottu Corner',
    ]);
    expect(el.querySelector('[aria-live=polite]')?.textContent).toBe('1 restaurant found');
  });

  it('links each result to its restaurant page', async () => {
    const { el } = await show('/search', page(['Sea Spray']));
    expect(el.querySelector('a.card')?.getAttribute('href')).toBe('/restaurants/Sea%20Spray');
  });

  it('names the query and city in the empty state, and Clear filters resets the search', async () => {
    const { el, router } = await show('/search?city=Kandy&q=zzz&diet=Halal', page([]));
    expect(el.textContent).toContain('No restaurants in Kandy match “zzz”');
    const navigate = spyOn(router, 'navigate').and.callThrough();
    Array.from(el.querySelectorAll('button'))
      .find((b) => b.textContent?.includes('Clear filters'))
      ?.click();
    await navigate.calls.mostRecent().returnValue;
    expect(router.url).toBe('/search?city=Kandy');
  });

  it('shows an error with Retry that fetches again', async () => {
    const { el, fixture, backend } = await show('/search', null, 500);
    expect(el.querySelector('[role=alert]')?.textContent).toContain('Could not load restaurants.');

    el.querySelector<HTMLButtonElement>('[role=alert] button')?.click();
    settle(fixture);
    backend.expectOne(isSearch).flush(page(['Sea Spray']));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(el.querySelectorAll('a.card').length).toBe(1);
  });

  it('pages through the results', async () => {
    const { el, router, fixture } = await show(
      '/search?page=2',
      page(['A'], { page: 2, totalPages: 3 }),
    );
    expect(el.querySelector('.pager span')?.textContent).toBe('Page 2 of 3');
    const [previous, next] = Array.from(el.querySelectorAll<HTMLButtonElement>('.pager button'));
    expect([previous.disabled, next.disabled]).toEqual([false, false]);
    next.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(router.url).toBe('/search?page=3');
  });

  it('discards a stale response when the search changes again', async () => {
    const { router, backend } = setup();
    await router.navigateByUrl('/search?diet=Halal');
    const fixture = TestBed.createComponent(SearchResultsComponent);
    settle(fixture);
    await router.navigateByUrl('/search?diet=Vegan');
    settle(fixture);

    const [first, second] = backend.match(isSearch);
    expect(first.cancelled).toBeTrue(); // the slow Halal request was abandoned
    second.flush(page(['Vegan Place']));
    backend
      .match((req) => req.url.endsWith('/categories'))
      .forEach((req) => {
        req.flush([]);
      });
    await fixture.whenStable();
    fixture.detectChanges();
    const names = (fixture.nativeElement as HTMLElement).querySelectorAll('a.card .name');
    expect(Array.from(names).map((n) => n.textContent)).toEqual(['Vegan Place']);
  });

  it('shows the skeleton only when loading takes longer than the delay', fakeAsync(() => {
    const { router, backend } = setup();
    void router.navigateByUrl('/search');
    tick();
    const fixture = TestBed.createComponent(SearchResultsComponent);
    settle(fixture);
    const el = fixture.nativeElement as HTMLElement;

    tick(SKELETON_DELAY_MS - 50);
    fixture.detectChanges();
    expect(el.querySelectorAll('app-skeleton').length).toBe(0);

    tick(50);
    fixture.detectChanges();
    expect(el.querySelectorAll('app-skeleton').length).toBeGreaterThan(0);
    backend.expectOne(isSearch).flush(page([]));
  }));
});
