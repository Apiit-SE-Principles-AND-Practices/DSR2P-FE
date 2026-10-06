import { Component, computed, inject } from '@angular/core';
import { rxResource, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { map, of, startWith, switchMap, timer } from 'rxjs';
import { AppStore } from '../core/app.store';
import { SearchParamsService } from '../core/search-params.service';
import { SearchService } from '../core/search.service';
import { FilterBarComponent } from '../shared/filter-bar.component';
import { InlineErrorComponent } from '../shared/inline-error.component';
import { RestaurantCardComponent } from '../shared/restaurant-card.component';
import { SkeletonComponent } from '../shared/skeleton.component';

export const SKELETON_DELAY_MS = 150;

@Component({
  selector: 'app-search-results',
  imports: [FilterBarComponent, InlineErrorComponent, RestaurantCardComponent, SkeletonComponent],
  styleUrl: './search-results.component.css',
  template: `
    <h1>Restaurants</h1>
    <app-filter-bar />
    <p aria-live="polite">{{ summary() }}</p>
    @let page = results.value();

    @if (results.error()) {
      <app-inline-error message="Could not load restaurants." (retry)="results.reload()" />
    } @else if (showSkeleton()) {
      <div aria-busy="true">
        @for (n of placeholders; track n) {
          <app-skeleton height="var(--space-12)" />
        }
      </div>
    } @else if (page) {
      <div class="results">
        @for (restaurant of page.data; track restaurant.id) {
          <app-restaurant-card [restaurant]="restaurant" />
        }
      </div>
      @if (page.data.length === 0) {
        <p>
          No restaurants in {{ city() }} match
          {{ params().q ? '“' + params().q + '”' : 'these filters' }}. Try a different name or clear
          the filters.
        </p>
        <button type="button" class="btn secondary" (click)="search.reset()">Clear filters</button>
      }
      @if (page.totalPages > 1) {
        <nav class="pager" aria-label="Pagination">
          <button
            type="button"
            class="btn secondary"
            [disabled]="page.page <= 1"
            (click)="go(page.page - 1)"
          >
            Previous
          </button>
          <span>Page {{ page.page }} of {{ page.totalPages }}</span>
          <button
            type="button"
            class="btn secondary"
            [disabled]="page.page >= page.totalPages"
            (click)="go(page.page + 1)"
          >
            Next
          </button>
        </nav>
      }
    }
  `,
})
export class SearchResultsComponent {
  protected readonly search = inject(SearchParamsService);
  private readonly service = inject(SearchService);
  private readonly app = inject(AppStore);
  protected readonly params = this.search.params;
  protected readonly placeholders = [1, 2, 3, 4, 5];
  protected readonly city = computed(() => this.params().city ?? this.app.city());

  /** A new request replaces the previous one, so a slow stale response can never overwrite newer results. */
  protected readonly results = rxResource({
    request: this.params,
    loader: ({ request }) => this.service.search(request),
  });

  /** Skeleton only if loading drags on, so quick responses do not flicker. */
  protected readonly showSkeleton = toSignal(
    toObservable(this.results.isLoading).pipe(
      switchMap((loading) =>
        loading
          ? timer(SKELETON_DELAY_MS).pipe(
              map(() => true),
              startWith(false),
            )
          : of(false),
      ),
    ),
    { initialValue: false },
  );

  /** Announced to screen readers after every search. */
  protected readonly summary = computed(() => {
    const total = this.results.value()?.total;
    return total === undefined
      ? ''
      : `${String(total)} ${total === 1 ? 'restaurant' : 'restaurants'} found`;
  });

  protected go(page: number): void {
    void this.search.update({ page });
  }
}
