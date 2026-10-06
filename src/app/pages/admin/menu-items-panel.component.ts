import { Component, computed, inject, input, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { AdminService } from '../../core/admin.service';
import { CategoryService } from '../../core/category.service';
import { formatLkr } from '../../core/format';
import { groupMenu, type MenuItem } from '../../core/menu';
import { RestaurantService } from '../../core/restaurant.service';
import { AdminTableComponent, type AdminColumn } from '../../shared/admin-table.component';
import { ConfirmDeleteDialogComponent } from '../../shared/confirm-delete-dialog.component';
import { InlineErrorComponent } from '../../shared/inline-error.component';
import { SkeletonComponent } from '../../shared/skeleton.component';
import { ToastService } from '../../shared/toast.service';
import { MenuItemFormComponent } from './menu-item-form.component';

const dietary = (item: MenuItem): string =>
  [item.isVegetarian && 'Vegetarian', item.isVegan && 'Vegan', item.isHalal && 'Halal']
    .filter(Boolean)
    .join(', ') || 'None';

/** A restaurant's dishes for an Admin: add, edit, delete. Rows come from the server's response, never the typed values. */
@Component({
  selector: 'app-menu-items-panel',
  imports: [
    AdminTableComponent,
    ConfirmDeleteDialogComponent,
    InlineErrorComponent,
    MenuItemFormComponent,
    SkeletonComponent,
  ],
  template: `
    <h2>Menu</h2>
    @if (editing() === null) {
      <button type="button" class="btn secondary" (click)="editing.set('new')">Add a dish</button>
    } @else {
      <app-menu-item-form
        [restaurantId]="restaurantId()"
        [item]="editItem()"
        [categories]="categories.value() ?? []"
        (saved)="onSaved($event)"
        (cancelled)="editing.set(null)"
      />
    }

    @if (menu.error()) {
      <app-inline-error message="Could not load the menu." (retry)="menu.reload()" />
    } @else if (menu.value()) {
      <app-admin-table
        caption="Menu"
        empty="No dishes yet."
        [columns]="columns()"
        [rows]="rows()"
        [rowId]="rowId"
        [actions]="actions"
      />
    } @else {
      <app-skeleton height="var(--space-12)" />
    }

    <ng-template #actions let-row>
      <button type="button" class="btn secondary" (click)="editing.set(row)">
        Edit<span class="sr-only"> {{ row.name }}</span>
      </button>
      <button type="button" class="btn danger" (click)="pending.set(row)">
        Delete<span class="sr-only"> {{ row.name }}</span>
      </button>
    </ng-template>

    @if (pending(); as item) {
      <app-confirm-delete-dialog
        [name]="item.name"
        [impact]="linkWarning"
        [busy]="deleting()"
        (confirmed)="remove(item)"
        (cancelled)="pending.set(null)"
      />
    }
  `,
})
export class MenuItemsPanelComponent {
  private readonly admin = inject(AdminService);
  private readonly api = inject(RestaurantService);
  private readonly categoryApi = inject(CategoryService);
  private readonly toast = inject(ToastService);
  readonly restaurantId = input.required<string>();

  protected readonly editing = signal<MenuItem | 'new' | null>(null);
  protected readonly editItem = computed(() => {
    const target = this.editing();
    return target === 'new' ? null : target;
  });
  protected readonly pending = signal<MenuItem | null>(null);
  protected readonly deleting = signal(false);
  protected readonly linkWarning = ['the link from any review that mentions this dish'];
  protected readonly rowId = (item: MenuItem): number => item.id;

  protected readonly menu = rxResource({
    request: () => this.restaurantId(),
    loader: ({ request }) => this.api.menu(request),
  });
  protected readonly categories = rxResource({ loader: () => this.categoryApi.all$ });

  protected readonly rows = computed(() =>
    groupMenu(this.menu.value() ?? [], this.categories.value() ?? []).flatMap((g) => g.items),
  );
  protected readonly columns = computed<AdminColumn<MenuItem>[]>(() => [
    { label: 'Name', value: (i) => i.name },
    {
      label: 'Category',
      value: (i) => this.categories.value()?.find((c) => c.id === i.categoryId)?.name ?? 'Other',
    },
    { label: 'Price', value: (i) => formatLkr(i.priceLkr) },
    { label: 'Dietary', value: dietary },
    { label: 'Spice', value: (i) => i.spiceLevel.replace('_', ' ') },
  ]);

  protected onSaved(saved: MenuItem): void {
    this.menu.update((list) => {
      const items = list ?? [];
      return items.some((i) => i.id === saved.id)
        ? items.map((i) => (i.id === saved.id ? saved : i))
        : [...items, saved];
    });
    this.editing.set(null);
    this.toast.show(`Saved ${saved.name}.`, 'success');
  }

  protected remove(item: MenuItem): void {
    this.deleting.set(true);
    this.admin
      .removeMenuItem(this.restaurantId(), item.id)
      .pipe(
        finalize(() => {
          this.deleting.set(false);
        }),
      )
      .subscribe({
        next: () => {
          this.menu.update((list) => list?.filter((i) => i.id !== item.id));
          this.pending.set(null);
          this.toast.show(`Deleted ${item.name}.`, 'success');
        },
        error: () => {
          this.toast.show(`Could not delete ${item.name}. Try again.`, 'error');
        },
      });
  }
}
