import { Component, inject, input } from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, fromEvent, map } from 'rxjs';
import { CategoryService } from '../../core/category.service';
import { groupMenu } from '../../core/menu';
import { RestaurantService } from '../../core/restaurant.service';
import { InlineErrorComponent } from '../../shared/inline-error.component';
import { SkeletonComponent } from '../../shared/skeleton.component';
import { MenuItemRowComponent } from './menu-item-row.component';

/** The menu grouped by category. Loads on its own and is re-fetched whenever the tab regains focus. */
@Component({
  selector: 'app-menu-section',
  imports: [InlineErrorComponent, MenuItemRowComponent, SkeletonComponent],
  styleUrl: './menu-section.component.css',
  template: `
    <section aria-labelledby="menu-title">
      <h2 id="menu-title">Menu</h2>
      @let groups = menu.value();
      @if (menu.error()) {
        <app-inline-error message="Could not load the menu." (retry)="menu.reload()" />
      } @else if (groups) {
        @for (group of groups; track group.name) {
          <h3 class="overline">{{ group.name }}</h3>
          @for (item of group.items; track item.id) {
            <app-menu-item-row [item]="item" />
          }
        } @empty {
          <p>Menu not available yet.</p>
        }
      } @else {
        <app-skeleton height="var(--space-12)" />
      }
    </section>
  `,
})
export class MenuSectionComponent {
  readonly restaurantId = input.required<string>();
  private readonly service = inject(RestaurantService);
  private readonly categories = inject(CategoryService);

  protected readonly menu = rxResource({
    request: this.restaurantId,
    loader: ({ request }) =>
      forkJoin([this.service.menu(request), this.categories.all$]).pipe(
        map(([items, categories]) => groupMenu(items, categories)),
      ),
  });

  constructor() {
    // A tab left open should pick up price changes: refresh when the window is focused again.
    fromEvent(window, 'focus')
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        this.menu.reload();
      });
  }
}
