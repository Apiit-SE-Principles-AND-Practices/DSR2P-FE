import { Component, input, output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import type { Category } from '../../core/category.service';
import { SPICE_LEVELS } from '../../core/search-params.service';

/** An empty dish, as the form groups used by this fieldset. */
export const newDish = () =>
  new FormGroup({
    name: new FormControl('', { nonNullable: true }),
    priceLkr: new FormControl<number | null>(null),
    categoryId: new FormControl<number | null>(null),
    spiceLevel: new FormControl('None', { nonNullable: true }),
    isVegetarian: new FormControl(false, { nonNullable: true }),
    isVegan: new FormControl(false, { nonNullable: true }),
    isHalal: new FormControl(false, { nonNullable: true }),
  });

/** One dish in the restaurant form (and, alone, in the menu panel). `errors` holds messages keyed by full path, e.g. `menuItems.2.priceLkr`. */
@Component({
  selector: 'app-menu-item-fieldset',
  imports: [ReactiveFormsModule],
  template: `
    <fieldset class="field" [formGroup]="group()">
      <legend>{{ legend() ?? 'Dish ' + (index() + 1) }}</legend>
      <label [for]="id('name')">Name</label>
      <input [id]="id('name')" formControlName="name" [attr.aria-invalid]="!!error('name')" />
      @if (error('name'); as message) {
        <span class="field-error">{{ message }}</span>
      }

      <label [for]="id('price')">Price (LKR)</label>
      <input
        [id]="id('price')"
        type="number"
        inputmode="decimal"
        min="0"
        step="0.01"
        formControlName="priceLkr"
        [attr.aria-invalid]="!!error('priceLkr')"
      />
      @if (error('priceLkr'); as message) {
        <span class="field-error">{{ message }}</span>
      }

      <label [for]="id('category')">Category</label>
      <select [id]="id('category')" class="select" formControlName="categoryId">
        <option [ngValue]="null">Choose a category</option>
        @for (category of categories(); track category.id) {
          <option [ngValue]="category.id">{{ category.name }}</option>
        }
      </select>
      @if (error('categoryId'); as message) {
        <span class="field-error">{{ message }}</span>
      }

      <label [for]="id('spice')">Spice level</label>
      <select [id]="id('spice')" class="select" formControlName="spiceLevel">
        @for (level of spiceLevels; track level) {
          <option [ngValue]="level">{{ level.replace('_', ' ') }}</option>
        }
      </select>

      <label
        style="display: flex;
    align-items: center;
    gap: inherit;"
        class="choice"
        ><input type="checkbox" formControlName="isVegetarian" /> Vegetarian</label
      >
      <label
        style="display: flex;
    align-items: center;
    gap: inherit;"
        class="choice"
        ><input type="checkbox" formControlName="isVegan" /> Vegan</label
      >
      <label
        style="display: flex;
    align-items: center;
    gap: inherit;"
        class="choice"
        ><input type="checkbox" formControlName="isHalal" /> Halal</label
      >

      @if (removable()) {
        <button type="button" class="btn secondary" (click)="remove.emit()">
          Remove dish {{ index() + 1 }}
        </button>
      }
    </fieldset>
  `,
})
export class MenuItemFieldsetComponent {
  readonly group = input.required<FormGroup>();
  readonly index = input.required<number>();
  readonly categories = input.required<Category[]>();
  readonly errors = input<Record<string, string>>({});
  readonly legend = input<string>();
  readonly removable = input(true);
  readonly remove = output();
  protected readonly spiceLevels = SPICE_LEVELS;

  protected id(field: string): string {
    return `dish-${String(this.index())}-${field}`;
  }

  protected error(field: string): string | undefined {
    return this.errors()[`menuItems.${String(this.index())}.${field}`];
  }
}
