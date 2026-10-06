import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { AdminService } from '../../core/admin.service';
import type { ApiError } from '../../core/api.interceptor';
import type { Category } from '../../core/category.service';
import type { MenuItem } from '../../core/menu';
import { FormErrorComponent } from '../../shared/form-error.component';
import { PhotoPickerComponent } from '../../shared/photo-picker.component';
import { menuItemSchema } from '../../shared/validation/restaurant.schema';
import { zodValidator } from '../../shared/validation/zod-validator';
import { MenuItemFieldsetComponent, newDish } from './menu-item-fieldset.component';

/** Add a dish, or edit `item`. The fieldset is the one the restaurant form uses, so both look and validate alike. */
@Component({
  selector: 'app-menu-item-form',
  imports: [
    FormErrorComponent,
    MenuItemFieldsetComponent,
    PhotoPickerComponent,
    ReactiveFormsModule,
  ],
  template: `
    <form (submit)="$event.preventDefault(); submit()" novalidate>
      <app-form-error [message]="error()" />
      <app-menu-item-fieldset
        [group]="form"
        [index]="0"
        [categories]="categories()"
        [errors]="errors()"
        [removable]="false"
        [legend]="item() ? 'Edit dish' : 'Add a dish'"
      />
      <app-photo-picker label="Dish photo (optional)" [confirmRights]="false" [(photo)]="photo" />
      <button class="btn" type="submit" [disabled]="busy()">
        {{ busy() ? 'Saving…' : 'Save dish' }}
      </button>
      <button type="button" class="btn secondary" (click)="cancelled.emit()">Cancel</button>
    </form>
  `,
})
export class MenuItemFormComponent {
  private readonly admin = inject(AdminService);
  readonly restaurantId = input.required<string>();
  readonly item = input<MenuItem | null>(null);
  readonly categories = input.required<Category[]>();
  /** The dish as the server saved it. */
  readonly saved = output<MenuItem>();
  readonly cancelled = output();

  protected readonly form = newDish();
  protected readonly photo = signal<File | null>(null);
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  private readonly attempted = signal(false);
  private readonly serverErrors = signal<Record<string, string>>({});
  private readonly value = toSignal(this.form.valueChanges, { initialValue: this.form.value });

  /** Keyed like the restaurant form's dishes (`menuItems.0.priceLkr`), which is what the fieldset reads. */
  protected readonly errors = computed<Record<string, string>>(() => {
    this.value();
    const local = (this.attempted() ? this.form.errors?.['zod'] : {}) as Record<string, string>;
    return Object.fromEntries(
      Object.entries({ ...local, ...this.serverErrors() }).map(([key, message]) => [
        `menuItems.0.${key}`,
        message,
      ]),
    );
  });

  constructor() {
    this.form.addValidators(zodValidator(menuItemSchema));
    this.form.valueChanges.subscribe(() => {
      this.serverErrors.set({});
    });
    effect(() => {
      const item = this.item();
      this.form.reset();
      this.photo.set(null);
      if (item) this.form.patchValue({ ...item, priceLkr: Number(item.priceLkr) });
    });
  }

  protected submit(): void {
    this.attempted.set(true);
    const parsed = menuItemSchema.safeParse(this.form.getRawValue());
    if (!parsed.success || this.busy()) return;
    const item = this.item();
    this.busy.set(true);
    this.error.set('');
    (item
      ? this.admin.updateMenuItem(this.restaurantId(), item.id, parsed.data, this.photo())
      : this.admin.addMenuItem(this.restaurantId(), parsed.data, this.photo())
    )
      .pipe(
        finalize(() => {
          this.busy.set(false);
        }),
      )
      .subscribe({
        next: (saved) => {
          this.saved.emit(saved);
        },
        error: (e: ApiError) => {
          this.serverErrors.set(e.fieldErrors ?? {});
          this.error.set(`We couldn’t save the dish. ${e.message}`);
        },
      });
  }
}
