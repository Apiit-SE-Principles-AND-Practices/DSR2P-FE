import { Component, computed, inject, input, signal } from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, fromEvent, map } from 'rxjs';
import { CategoryService } from '../../core/category.service';
import { groupMenu } from '../../core/menu';
import { RestaurantService } from '../../core/restaurant.service';
import { InlineErrorComponent } from '../../shared/inline-error.component';
import { SkeletonStackComponent } from '../../shared/skeleton-stack.component';
import { MenuItemRowComponent } from './menu-item-row.component';

/** The menu grouped by category with chip filters. Loads on its own and is re-fetched whenever the tab regains focus. */
@Component({
  selector: 'app-menu-section',
  imports: [InlineErrorComponent, MenuItemRowComponent, SkeletonStackComponent],
  styleUrl: './menu-section.component.css',
  template: `
    <section aria-labelledby="menu-title">
      <h2 id="menu-title">Menu</h2>
      @let groups = menu.value();
      @if (menu.error()) {
        <app-inline-error message="Could not load the menu." (retry)="menu.reload()" />
      } @else if (groups) {
        @if (groups.length > 1) {
          <div class="category-chips" role="group" aria-label="Menu categories">
            <button
              type="button"
              class="chip"
              [attr.aria-pressed]="selectedCategory() === null"
              (click)="selectCategory(null)"
            >
              All
            </button>
            @for (group of groups; track group.name) {
              <button
                type="button"
                class="chip"
                [attr.aria-pressed]="selectedCategory() === group.name"
                (click)="selectCategory(selectedCategory() === group.name ? null : group.name)"
              >
                {{ group.name }}
              </button>
            }
          </div>
        }
        @for (group of visibleGroups(); track group.name) {
          <h3 class="overline">{{ group.name }}</h3>
          @for (item of group.items; track item.id) {
            <app-menu-item-row [item]="item" />
          }
        } @empty {
          <p>Menu not available yet.</p>
        }
      } @else {
        <app-skeleton-stack [rows]="5" height="var(--space-10)" />
      }
    </section>
  `,
})
export class MenuSectionComponent {
  readonly restaurantId = input.required<string>();
  private readonly service = inject(RestaurantService);
  private readonly categories = inject(CategoryService);

  protected readonly selectedCategory = signal<string | null>(null);

  protected readonly menu = rxResource({
    request: this.restaurantId,
    loader: ({ request }) =>
      forkJoin([this.service.menu(request), this.categories.all$]).pipe(
        map(([items, categories]) => groupMenu(items, categories)),
      ),
  });

  protected readonly visibleGroups = computed(() => {
    const groups = this.menu.value() ?? [];
    const selected = this.selectedCategory();
    if (!selected) {
      return groups;
    }
    return groups.filter((g) => g.name === selected);
  });

  constructor() {
    // A tab left open should pick up price changes: refresh when the window is focused again.
    fromEvent(window, 'focus')
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        this.menu.reload();
      });
  }

  protected selectCategory(category: string | null): void {
    this.selectedCategory.set(category);
  }
}
