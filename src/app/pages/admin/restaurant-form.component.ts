import { Component, computed, effect, inject, signal } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  type AbstractControl,
  type ValidatorFn,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, concatMap, finalize, from, map, of, switchMap, tap, toArray } from 'rxjs';
import { AdminService, type MenuItemInput } from '../../core/admin.service';
import type { ApiError } from '../../core/api.interceptor';
import { CategoryService } from '../../core/category.service';
import { formatLkr } from '../../core/format';
import type { HasUnsavedChanges } from '../../core/guards';
import { RestaurantService } from '../../core/restaurant.service';
import { CITIES } from '../../core/search-params.service';
import { AdminTableComponent, type AdminColumn } from '../../shared/admin-table.component';
import { FormErrorComponent } from '../../shared/form-error.component';
import { ImageUrlFieldComponent } from '../../shared/image-url-field.component';
import { ToastService } from '../../shared/toast.service';
import { restaurantSchema } from '../../shared/validation/restaurant.schema';
import { fieldPath, zodValidator } from '../../shared/validation/zod-validator';
import { MenuItemDialogComponent } from './menu-item-dialog.component';
import type { StagedDish } from './menu-item-form.component';
import { MenuItemsPanelComponent } from './menu-items-panel.component';

const TEXT_FIELDS = [
  { key: 'name', label: 'Name' },
  { key: 'address', label: 'Address' },
];

/** A dish waiting in the table for the restaurant to exist. `error` is the server's complaint if it failed. */
interface DishRow {
  key: number;
  input: MenuItemInput;
  photo: File | null;
  error?: string;
}

/** The restaurant fields only: dishes are checked when they are added in the popup. */
const restaurantFieldsValidator: ValidatorFn = (group: AbstractControl) =>
  zodValidator(restaurantSchema)({
    value: { ...(group.value as object), menuItems: [] },
  } as AbstractControl);

/** The server's messages for dish `index`, from errors keyed `menuItems.<index>.<field>`. */
const dishMessage = (errors: Record<string, string>, index: number): string | undefined => {
  const prefix = `menuItems.${String(index)}.`;
  const messages = Object.entries(errors)
    .filter(([key]) => key.startsWith(prefix))
    .map(([, message]) => message);
  return messages.length > 0 ? `Failed: ${messages.join(' ')}` : undefined;
};

/**
 * Admin: add or edit a restaurant. A new one can start with dishes, added in a popup and listed in a table:
 * the API creates the restaurant first and then takes the dishes one by one, so any dish that fails stays
 * in the table and Retry sends only those.
 */
@Component({
  selector: 'app-restaurant-form',
  imports: [
    AdminTableComponent,
    FormErrorComponent,
    ImageUrlFieldComponent,
    MenuItemDialogComponent,
    MenuItemsPanelComponent,
    ReactiveFormsModule,
    RouterLink,
  ],
  styleUrl: './restaurant-form.component.css',
  template: `
    <a class="back" routerLink="/admin/restaurants">← All restaurants</a>
    <h1>{{ id ? 'Edit restaurant' : 'Add restaurant' }}</h1>
    <form [formGroup]="form" (submit)="$event.preventDefault(); submit()" novalidate>
      <app-form-error [message]="error()" />

      <section class="card" aria-labelledby="details-title">
        <h2 id="details-title">Details</h2>
        @for (field of textFields; track field.key) {
          <div class="field">
            <label [for]="field.key">{{ field.label }}</label>
            <input
              [id]="field.key"
              [formControlName]="field.key"
              [attr.aria-invalid]="!!errors()[field.key]"
            />
            @if (errors()[field.key]; as message) {
              <span class="field-error">{{ message }}</span>
            }
          </div>
        }

        <div class="field">
          <label for="city">City</label>
          <select id="city" class="select" formControlName="city">
            <option value="">Choose a city</option>
            @for (city of cities; track city) {
              <option [value]="city">{{ city }}</option>
            }
          </select>
          @if (errors()['city']; as message) {
            <span class="field-error">{{ message }}</span>
          }
        </div>

        <app-image-url-field [control]="form.controls.imageUrl" [error]="errors()['imageUrl']" />
      </section>

      <section class="card">
        <fieldset class="chips">
          <legend>Categories</legend>
          @for (category of categoryList(); track category.id) {
            <label class="choice chip">
              <input
                type="checkbox"
                [checked]="form.controls.categoryIds.value.includes(category.id)"
                (change)="toggleCategory(category.id)"
              />
              {{ category.name }}
            </label>
          }
          @if (errors()['categoryIds']; as message) {
            <span class="field-error">{{ message }}</span>
          }
        </fieldset>
      </section>

      @if (!id) {
        <section class="card" aria-labelledby="menu-title">
          <header class="card-head">
            <h2 id="menu-title">Menu</h2>
            <button type="button" class="btn secondary" (click)="adding.set(true)">
              Add a dish
            </button>
          </header>
          <app-admin-table
            caption="Dishes to add"
            empty="No dishes yet. You can also add them after saving."
            [columns]="dishColumns()"
            [rows]="dishes()"
            [rowId]="dishId"
            [actions]="dishActions"
          />
          <ng-template #dishActions let-row>
            <button type="button" class="btn danger" (click)="removeDish(row.key)">
              Remove<span class="sr-only"> {{ row.input.name }}</span>
            </button>
          </ng-template>
        </section>
      }

      <div class="actions">
        <button class="btn" type="submit" [disabled]="busy()">
          {{ busy() ? 'Saving…' : failed() ? 'Retry' : 'Save' }}
        </button>
        <a class="btn secondary" routerLink="/admin/restaurants">Cancel</a>
      </div>
    </form>

    @if (id) {
      <section class="card">
        <app-menu-items-panel [restaurantId]="id" />
      </section>
    }

    @if (adding()) {
      <app-menu-item-dialog
        [categories]="categoryList()"
        (staged)="stageDish($event)"
        (closed)="adding.set(false)"
      />
    }
  `,
})
export class RestaurantFormComponent implements HasUnsavedChanges {
  private readonly admin = inject(AdminService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly categoryApi = inject(CategoryService);
  private readonly restaurantApi = inject(RestaurantService);
  protected readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id');
  private createdId: string | null = null;
  private saved = false;
  private nextKey = 0;

  protected readonly textFields = TEXT_FIELDS;
  protected readonly cities = CITIES;
  protected readonly adding = signal(false);
  protected readonly dishes = signal<DishRow[]>([]);
  protected readonly dishId = (row: DishRow): number => row.key;
  protected readonly dishColumns = computed<AdminColumn<DishRow>[]>(() => [
    { label: 'Name', value: (d) => d.input.name },
    {
      label: 'Category',
      value: (d) => this.categoryList().find((c) => c.id === d.input.categoryId)?.name ?? 'Other',
    },
    { label: 'Price', value: (d) => formatLkr(d.input.priceLkr) },
    {
      label: 'Dietary',
      value: (d) =>
        [
          d.input.isVegetarian && 'Vegetarian',
          d.input.isVegan && 'Vegan',
          d.input.isHalal && 'Halal',
        ]
          .filter(Boolean)
          .join(', ') || 'None',
    },
    { label: 'Spice', value: (d) => d.input.spiceLevel.replace('_', ' ') },
    { label: 'Status', value: (d) => d.error ?? 'Ready' },
  ]);
  protected readonly form = new FormGroup(
    {
      name: new FormControl('', { nonNullable: true }),
      city: new FormControl('', { nonNullable: true }),
      categoryIds: new FormControl<number[]>([], { nonNullable: true }),
      address: new FormControl('', { nonNullable: true }),
      imageUrl: new FormControl('', { nonNullable: true }),
    },
    { validators: restaurantFieldsValidator },
  );

  protected readonly busy = signal(false);
  protected readonly failed = signal(false);
  protected readonly error = signal('');
  private readonly attempted = signal(false);
  private readonly serverErrors = signal<Record<string, string>>({});
  private readonly value = toSignal(this.form.valueChanges, { initialValue: this.form.value });

  /** The schema's messages once Save was pressed, overridden by the server's. Keyed by full path. */
  protected readonly errors = computed<Record<string, string>>(() => {
    this.value();
    const local = (this.attempted() ? this.form.errors?.['zod'] : {}) as Record<string, string>;
    return { ...local, ...this.serverErrors() };
  });

  private readonly categories = rxResource({ loader: () => this.categoryApi.all$ });
  protected readonly categoryList = computed(() => this.categories.value() ?? []);
  private readonly existing = rxResource({
    request: () => this.id ?? undefined,
    loader: ({ request }) => this.restaurantApi.get(request),
  });

  constructor() {
    // Editing anything dismisses the server's field errors; the next Save re-checks them.
    this.form.valueChanges.subscribe(() => {
      this.serverErrors.set({});
    });
    effect(() => {
      const r = this.existing.value();
      if (!r) return;
      this.form.patchValue({
        name: r.name,
        city: r.city,
        categoryIds: r.categories.map((c) => c.id),
        address: r.address,
        imageUrl: r.imageUrl ?? '',
      });
      this.form.markAsPristine();
    });
  }

  /** The unsaved-changes guard asks this before leaving the page. */
  hasUnsavedChanges(): boolean {
    return (this.form.dirty || this.dishes().length > 0) && !this.saved;
  }

  protected toggleCategory(categoryId: number): void {
    const { categoryIds } = this.form.controls;
    categoryIds.setValue(
      categoryIds.value.includes(categoryId)
        ? categoryIds.value.filter((id) => id !== categoryId)
        : [...categoryIds.value, categoryId],
    );
    categoryIds.markAsDirty();
  }

  protected stageDish({ input, photo }: StagedDish): void {
    this.dishes.update((list) => [...list, { key: this.nextKey++, input, photo }]);
    this.adding.set(false);
  }

  protected removeDish(key: number): void {
    this.dishes.update((list) => list.filter((d) => d.key !== key));
  }

  protected submit(): void {
    this.attempted.set(true);
    const parsed = restaurantSchema.safeParse({
      ...this.form.getRawValue(),
      menuItems: this.dishes().map((d) => d.input),
    });
    if (!parsed.success || this.busy()) return;
    if (this.form.controls.imageUrl.hasError('unloadable')) {
      this.error.set('The image address does not open as an image. Fix it or leave it empty.');
      return;
    }
    const { name, city, categoryIds, address, imageUrl } = parsed.data;
    const body = { name, city, categoryIds, address, ...(imageUrl && { imageUrl }) };
    this.busy.set(true);
    this.error.set('');
    const restaurantId$ = this.id
      ? this.admin.update(this.id, body).pipe(map((r) => r.id))
      : this.createdId
        ? of(this.createdId)
        : this.admin.create(body).pipe(
            map((r) => r.id),
            tap((id) => {
              this.createdId = id;
            }),
          );
    restaurantId$
      .pipe(
        switchMap((id) => this.addDishes(id)),
        finalize(() => {
          this.busy.set(false);
        }),
      )
      .subscribe({
        next: (failures) => {
          if (failures.length === 0) this.finish(name);
          else this.keepFailed(failures);
        },
        error: (e: ApiError) => {
          this.failed.set(true);
          const fieldErrors = Object.fromEntries(
            Object.entries(e.fieldErrors ?? {}).map(([key, message]) => [fieldPath(key), message]),
          );
          this.serverErrors.set(fieldErrors);
          this.dishes.update((list) =>
            list.map((d, i) => ({ ...d, error: dishMessage(fieldErrors, i) })),
          );
          this.error.set(
            `We couldn’t save the restaurant. ${e.message} Check the details and press Retry.`,
          );
        },
      });
  }

  /** One request per dish, in order. A dish that fails does not stop the others. */
  private addDishes(restaurantId: string) {
    return from(this.dishes()).pipe(
      concatMap(({ key, input, photo }) =>
        this.admin.addMenuItem(restaurantId, input, photo).pipe(
          map(() => null),
          catchError((e: ApiError) => of({ key, e })),
        ),
      ),
      toArray(),
      map((results) => results.filter((result) => result !== null)),
    );
  }

  /** The restaurant exists: leave only the dishes that failed, each with the server's message. */
  private keepFailed(failures: { key: number; e: ApiError }[]): void {
    const byKey = new Map(failures.map(({ key, e }) => [key, e]));
    this.dishes.update((list) =>
      list
        .filter((d) => byKey.has(d.key))
        .map((d) => {
          const e = byKey.get(d.key);
          const detail = Object.values(e?.fieldErrors ?? {}).join(' ') || e?.message;
          return { ...d, error: `Failed: ${detail ?? 'try again'}` };
        }),
    );
    this.failed.set(true);
    this.serverErrors.set({});
    this.error.set(
      `The restaurant was saved, but ${String(failures.length)} dish(es) could not be added. They are still below: remove any you do not want and press Retry.`,
    );
  }

  private finish(name: string): void {
    this.saved = true;
    this.toast.show(`Saved ${name}.`, 'success');
    void this.router.navigate(['/admin/restaurants']);
  }
}
