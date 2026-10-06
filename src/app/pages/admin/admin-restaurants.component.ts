import { Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AdminService, type AdminRestaurant } from '../../core/admin.service';
import { CITIES } from '../../core/search-params.service';
import { AdminTableComponent, type AdminColumn } from '../../shared/admin-table.component';
import { ConfirmDeleteDialogComponent } from '../../shared/confirm-delete-dialog.component';
import { InlineErrorComponent } from '../../shared/inline-error.component';
import { SkeletonComponent } from '../../shared/skeleton.component';
import { ToastService } from '../../shared/toast.service';

const COLUMNS: AdminColumn<AdminRestaurant>[] = [
  { label: 'Name', value: (r) => r.name },
  { label: 'City', value: (r) => r.city },
  { label: 'Categories', value: (r) => r.categories.map((c) => c.name).join(', ') },
];

/** Admin: every restaurant with search, a city filter, and edit / delete. */
@Component({
  selector: 'app-admin-restaurants',
  imports: [
    AdminTableComponent,
    ConfirmDeleteDialogComponent,
    InlineErrorComponent,
    RouterLink,
    SkeletonComponent,
  ],
  template: `
    <h1>Restaurants</h1>
    <a class="btn" routerLink="/admin/restaurants/new">Add restaurant</a>

    <div class="field">
      <label for="restaurant-search">Search by name or address</label>
      <input
        id="restaurant-search"
        type="search"
        [value]="query()"
        #box
        (input)="query.set(box.value)"
      />
    </div>
    <div class="field">
      <label for="restaurant-city">City</label>
      <select id="restaurant-city" class="select" #cityBox (change)="city.set(cityBox.value)">
        <option value="">All cities</option>
        @for (option of cities; track option) {
          <option [value]="option" [selected]="option === city()">{{ option }}</option>
        }
      </select>
    </div>

    @if (restaurants.error()) {
      <app-inline-error message="Could not load the restaurants." (retry)="restaurants.reload()" />
    } @else if (restaurants.value()) {
      <app-admin-table
        caption="Restaurants"
        empty="No restaurants match."
        [columns]="columns"
        [rows]="shown()"
        [rowId]="rowId"
        [actions]="actions"
      />
    } @else {
      <app-skeleton height="var(--space-12)" />
    }

    <ng-template #actions let-row>
      <a class="btn secondary" [routerLink]="['/admin/restaurants', row.id, 'edit']"
        >Edit<span class="sr-only"> {{ row.name }}</span></a
      >
      <button type="button" class="btn danger" (click)="pending.set(row)">
        Delete<span class="sr-only"> {{ row.name }}</span>
      </button>
    </ng-template>

    @if (pending(); as restaurant) {
      <app-confirm-delete-dialog
        [name]="restaurant.name"
        [impact]="impactLines()"
        [busy]="deleting()"
        (confirmed)="remove(restaurant)"
        (cancelled)="pending.set(null)"
      />
    }
  `,
})
export class AdminRestaurantsComponent {
  private readonly admin = inject(AdminService);
  private readonly toast = inject(ToastService);

  protected readonly cities = CITIES;
  protected readonly columns = COLUMNS;
  protected readonly rowId = (r: AdminRestaurant): string => r.id;
  protected readonly query = signal('');
  protected readonly city = signal('');
  protected readonly pending = signal<AdminRestaurant | null>(null);
  protected readonly deleting = signal(false);

  protected readonly restaurants = rxResource({ loader: () => this.admin.list() });
  private readonly impact = rxResource({
    request: () => this.pending()?.id,
    loader: ({ request }) => this.admin.impact(request),
  });

  protected readonly shown = computed(() => {
    const text = this.query().trim().toLowerCase();
    return (this.restaurants.value() ?? []).filter(
      (r) =>
        (this.city() === '' || r.city === this.city()) &&
        `${r.name} ${r.address}`.toLowerCase().includes(text),
    );
  });

  /** `undefined` while counting; if counting fails the dialog still works, with a plain warning. */
  protected readonly impactLines = computed(() => {
    const counts = this.impact.value();
    if (this.impact.error()) return ['its menu items and reviews'];
    return counts
      ? [`${String(counts.menuItems)} menu items`, `${String(counts.reviews)} reviews`]
      : null;
  });

  protected remove(restaurant: AdminRestaurant): void {
    this.deleting.set(true);
    this.admin
      .remove(restaurant.id)
      .pipe(
        finalize(() => {
          this.deleting.set(false);
        }),
      )
      .subscribe({
        next: () => {
          this.pending.set(null);
          this.toast.show(`Deleted ${restaurant.name}.`, 'success');
          this.restaurants.reload();
        },
        error: () => {
          this.toast.show(`Could not delete ${restaurant.name}. Try again.`, 'error');
        },
      });
  }
}
