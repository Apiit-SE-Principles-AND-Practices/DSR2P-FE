import { Component, computed, effect, inject, signal } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, concatMap, finalize, from, map, of, switchMap, tap, toArray } from 'rxjs';
import { AdminService, type MenuItemInput } from '../../core/admin.service';
import type { ApiError } from '../../core/api.interceptor';
import { CategoryService } from '../../core/category.service';
import type { HasUnsavedChanges } from '../../core/guards';
import { RestaurantService } from '../../core/restaurant.service';
import { CITIES } from '../../core/search-params.service';
import { FormErrorComponent } from '../../shared/form-error.component';
import { ImageUrlFieldComponent } from '../../shared/image-url-field.component';
import { ToastService } from '../../shared/toast.service';
import { restaurantSchema } from '../../shared/validation/restaurant.schema';
import { fieldPath, zodValidator } from '../../shared/validation/zod-validator';
import { MenuItemsPanelComponent } from './menu-items-panel.component';
import { MenuItemFieldsetComponent, newDish } from './menu-item-fieldset.component';

const TEXT_FIELDS = [
  { key: 'name', label: 'Name' },
  { key: 'address', label: 'Address' },
];

/**
 * Admin: add or edit a restaurant. A new one can start with dishes: the API creates the restaurant first and
 * then takes the dishes one by one, so any dish that fails stays on the form and Retry sends only those.
 */
@Component({
  selector: 'app-restaurant-form',
  imports: [
    FormErrorComponent,
    ImageUrlFieldComponent,
    MenuItemFieldsetComponent,
    MenuItemsPanelComponent,
    ReactiveFormsModule,
    RouterLink,
  ],
  template: `
    <h1>{{ id ? 'Edit restaurant' : 'Add restaurant' }}</h1>
    <form [formGroup]="form" (submit)="$event.preventDefault(); submit()" novalidate>
      <app-form-error [message]="error()" />

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

      <app-image-url-field [control]="form.controls.imageUrl" [error]="errors()['imageUrl']" />

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

      <fieldset class="field">
        <legend>Categories</legend>
        @for (category of categoryList(); track category.id) {
          <label class="choice">
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

      @if (!id) {
        <h2>Menu</h2>
        @for (dish of menuItems.controls; track dish; let i = $index) {
          <app-menu-item-fieldset
            [group]="dish"
            [index]="i"
            [categories]="categoryList()"
            [errors]="errors()"
            (remove)="removeDish(i)"
          />
        }
        <button type="button" class="btn secondary" (click)="addDish()">Add a dish</button>
      }

      <div>
        <button class="btn" type="submit" [disabled]="busy()">
          {{ busy() ? 'Saving…' : failed() ? 'Retry' : 'Save' }}
        </button>
        <a class="btn secondary" routerLink="/admin/restaurants">Cancel</a>
      </div>
    </form>
    @if (id) {
      <app-menu-items-panel [restaurantId]="id" />
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

  protected readonly textFields = TEXT_FIELDS;
  protected readonly cities = CITIES;
  protected readonly menuItems = new FormArray<ReturnType<typeof newDish>>([]);
  protected readonly form = new FormGroup(
    {
      name: new FormControl('', { nonNullable: true }),
      city: new FormControl('', { nonNullable: true }),
      categoryIds: new FormControl<number[]>([], { nonNullable: true }),
      address: new FormControl('', { nonNullable: true }),
      imageUrl: new FormControl('', { nonNullable: true }),
      menuItems: this.menuItems,
    },
    { validators: zodValidator(restaurantSchema) },
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
    return this.form.dirty && !this.saved;
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

  protected addDish(): void {
    this.menuItems.push(newDish());
    this.menuItems.markAsDirty();
  }

  protected removeDish(index: number): void {
    this.menuItems.removeAt(index);
    this.menuItems.markAsDirty();
  }

  protected submit(): void {
    this.attempted.set(true);
    const parsed = restaurantSchema.safeParse(this.form.getRawValue());
    if (!parsed.success || this.busy()) return;
    if (this.form.controls.imageUrl.hasError('unloadable')) {
      this.error.set('The image address does not open as an image. Fix it or leave it empty.');
      return;
    }
    const { menuItems, imageUrl, ...fields } = parsed.data;
    const body = { ...fields, ...(imageUrl && { imageUrl }) };
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
        switchMap((id) => this.addDishes(id, menuItems)),
        finalize(() => {
          this.busy.set(false);
        }),
      )
      .subscribe({
        next: (failures) => {
          if (failures.length === 0) this.finish(fields.name);
          else this.keepFailed(failures);
        },
        error: (e: ApiError) => {
          this.failed.set(true);
          this.serverErrors.set(
            Object.fromEntries(
              Object.entries(e.fieldErrors ?? {}).map(([key, message]) => [
                fieldPath(key),
                message,
              ]),
            ),
          );
          this.error.set(
            `We couldn’t save the restaurant. ${e.message} Check the details and press Retry.`,
          );
        },
      });
  }

  /** One request per dish, in order. A dish that fails does not stop the others. */
  private addDishes(restaurantId: string, items: MenuItemInput[]) {
    return from(items.entries()).pipe(
      concatMap(([index, item]) =>
        this.admin.addMenuItem(restaurantId, item).pipe(
          map(() => null),
          catchError((e: ApiError) => of({ index, e })),
        ),
      ),
      toArray(),
      map((results) => results.filter((result) => result !== null)),
    );
  }

  /** The restaurant exists: leave only the dishes that failed, each with the server's messages. */
  private keepFailed(failures: { index: number; e: ApiError }[]): void {
    const failedIndexes = new Set(failures.map(({ index }) => index));
    for (let i = this.menuItems.length - 1; i >= 0; i--) {
      if (!failedIndexes.has(i)) this.menuItems.removeAt(i);
    }
    this.failed.set(true);
    this.serverErrors.set(
      Object.fromEntries(
        failures.flatMap(({ e }, row) =>
          Object.entries(e.fieldErrors ?? {}).map(([key, message]) => [
            `menuItems.${String(row)}.${key}`,
            message,
          ]),
        ),
      ),
    );
    this.error.set(
      `The restaurant was saved, but ${String(failures.length)} dish(es) could not be added. They are still below: fix them and press Retry.`,
    );
  }

  private finish(name: string): void {
    this.saved = true;
    this.toast.show(`Saved ${name}.`, 'success');
    void this.router.navigate(['/admin/restaurants']);
  }
}
