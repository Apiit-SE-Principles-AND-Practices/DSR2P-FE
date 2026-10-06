import { Component, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { AppStore } from '../core/app.store';
import { CategoryService } from '../core/category.service';
import { toQuery } from '../core/search-params.service';
import { InlineErrorComponent } from '../shared/inline-error.component';
import { SkeletonComponent } from '../shared/skeleton.component';

/** Category tiles; each one opens the results for the selected city, filtered by that category. */
@Component({
  selector: 'app-category-grid',
  imports: [RouterLink, InlineErrorComponent, SkeletonComponent],
  styleUrl: './category-grid.component.css',
  template: `
    <section aria-labelledby="categories-title">
      <h2 id="categories-title">Browse by category</h2>
      @if (categories.error()) {
        <app-inline-error message="Could not load categories." (retry)="categories.reload()" />
      } @else if (categories.isLoading()) {
        <div class="grid" aria-busy="true">
          @for (n of placeholders; track n) {
            <app-skeleton height="var(--space-12)" />
          }
        </div>
      } @else {
        <div class="grid">
          @for (category of categories.value(); track category.id) {
            <a class="tile" routerLink="/search" [queryParams]="query(category.id)">{{
              category.name
            }}</a>
          } @empty {
            <p>No categories yet.</p>
          }
        </div>
      }
    </section>
  `,
})
export class CategoryGridComponent {
  private readonly app = inject(AppStore);
  private readonly service = inject(CategoryService);
  protected readonly placeholders = [1, 2, 3, 4, 5, 6];

  protected readonly categories = rxResource({ loader: () => this.service.all$ });

  protected query(categoryId: number) {
    return toQuery({ city: this.app.city(), categoryId, page: 1 });
  }
}
