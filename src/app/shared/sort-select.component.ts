import { Component, computed, inject } from '@angular/core';
import { DEFAULT_SORT, SearchParamsService, SORTS } from '../core/search-params.service';

const LABELS: Record<(typeof SORTS)[number], string> = {
  rating: 'Top rated',
  price: 'Price: low to high',
};

/** Sort order for the results, kept in the URL (`?sort=price`). Restaurants without a rating or price come last. */
@Component({
  selector: 'app-sort-select',
  styleUrl: './sort-select.component.css',
  template: `
    <div class="field">
      <label for="sort">Sort by</label>
      <select id="sort" class="select" #sort (change)="pick(sort.value)">
        @for (option of sorts; track option) {
          <option [value]="option" [selected]="option === current()">{{ labels[option] }}</option>
        }
      </select>
    </div>
  `,
})
export class SortSelectComponent {
  private readonly search = inject(SearchParamsService);
  protected readonly sorts = SORTS;
  protected readonly labels = LABELS;
  protected readonly current = computed(() => this.search.params().sort ?? DEFAULT_SORT);

  protected pick(value: string): void {
    const sort = SORTS.find((option) => option === value);
    void this.search.update({ sort: sort === DEFAULT_SORT ? undefined : sort });
  }
}
