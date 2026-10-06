import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { matchesBreakpoint } from '../core/breakpoint';
import { CategoryService } from '../core/category.service';
import {
  CLEARED_FILTERS,
  DIETS,
  FILTER_KEYS,
  PRICE_BANDS,
  SearchParamsService,
  SPICE_LEVELS,
  type SearchParams,
} from '../core/search-params.service';
import { SortSelectComponent } from './sort-select.component';

type Filters = Partial<Pick<SearchParams, (typeof FILTER_KEYS)[number]>>;

const optionsOf = (values: readonly string[]) =>
  values.map((value) => ({ value, label: value.replace('_', ' ') }));

/**
 * Filters for the results. From 640px they sit inline and apply at once; below that they live in a
 * bottom sheet and apply together with the Apply button. The backend takes one value per filter,
 * so the dietary chips are exclusive.
 */
@Component({
  selector: 'app-filter-bar',
  imports: [NgTemplateOutlet, SortSelectComponent],
  styleUrl: './filter-bar.component.css',
  template: `
    <ng-template #controls>
      @for (select of selects(); track select.key) {
        <div class="field">
          <label [for]="'filter-' + select.key">{{ select.label }}</label>
          <select
            class="select"
            [id]="'filter-' + select.key"
            #field
            (change)="setSelect(select.key, field.value)"
          >
            <option value="">Any</option>
            @for (option of select.options; track option.value) {
              <option
                [value]="option.value"
                [selected]="shown()[select.key]?.toString() === option.value"
              >
                {{ option.label }}
              </option>
            }
          </select>
        </div>
      }
      <div class="chips" role="group" aria-label="Dietary">
        @for (diet of diets; track diet) {
          <button
            type="button"
            class="chip"
            [attr.aria-pressed]="shown().diet === diet"
            (click)="change({ diet: shown().diet === diet ? undefined : diet })"
          >
            {{ shown().diet === diet ? '✓ ' : '' }}{{ diet }}
          </button>
        }
      </div>
    </ng-template>

    @if (isTablet()) {
      <div class="bar">
        <ng-container *ngTemplateOutlet="controls" />
        <app-sort-select />
        <button type="button" class="btn secondary" (click)="clear()">Clear all</button>
      </div>
    } @else {
      <div class="bar">
        <button type="button" class="btn secondary" (click)="open(sheet)">
          Filters ({{ count() }})
        </button>
        <app-sort-select />
      </div>
      <dialog #sheet class="sheet" aria-labelledby="filters-title">
        <h2 id="filters-title">Filters</h2>
        <ng-container *ngTemplateOutlet="controls" />
        <div class="actions">
          <button type="button" class="btn secondary" (click)="clear()">Clear all</button>
          <button type="button" class="btn secondary" (click)="sheet.close()">Cancel</button>
          <button type="button" class="btn" (click)="apply(sheet)">Apply</button>
        </div>
      </dialog>
    }
  `,
})
export class FilterBarComponent {
  private readonly search = inject(SearchParamsService);
  private readonly categoryService = inject(CategoryService);
  private readonly categories = rxResource({ loader: () => this.categoryService.all$ });
  private readonly draft = signal<Filters>({});
  protected readonly isTablet = matchesBreakpoint('tablet');
  protected readonly diets = DIETS;

  /** What the controls show: the live URL on wide screens, the unapplied edits on the sheet. */
  protected readonly shown = computed<Filters>(() => ({
    ...this.search.params(),
    ...(this.isTablet() ? {} : this.draft()),
  }));

  /** Filters currently applied, for the "Filters (n)" button. */
  protected readonly count = computed(
    () => FILTER_KEYS.filter((key) => this.search.params()[key] !== undefined).length,
  );

  protected readonly selects = computed(() => [
    {
      key: 'categoryId' as const,
      label: 'Category',
      options: (this.categories.value() ?? []).map(({ id, name }) => ({
        value: String(id),
        label: name,
      })),
    },
    { key: 'spice' as const, label: 'Spice level', options: optionsOf(SPICE_LEVELS) },
    { key: 'price' as const, label: 'Price band', options: optionsOf(PRICE_BANDS) },
  ]);

  protected setSelect(key: 'categoryId' | 'spice' | 'price', value: string): void {
    // Option values come from our own lists; the URL parser re-validates them on read.
    const parsed = key === 'categoryId' ? Number(value) : value;
    this.change({ [key]: value === '' ? undefined : parsed });
  }

  protected change(patch: Filters): void {
    if (this.isTablet()) void this.search.update(patch);
    else this.draft.update((draft) => ({ ...draft, ...patch }));
  }

  protected clear(): void {
    if (this.isTablet()) void this.search.clearFilters();
    else this.draft.set(CLEARED_FILTERS);
  }

  protected open(sheet: HTMLDialogElement): void {
    this.draft.set({});
    sheet.showModal();
  }

  protected apply(sheet: HTMLDialogElement): void {
    void this.search.update(this.draft());
    sheet.close();
  }
}
