import { Component, computed, input } from '@angular/core';
import { formatLkr } from '../../core/format';
import type { MenuItem } from '../../core/menu';
import { SPICE_LEVELS } from '../../core/search-params.service';

const SPICE_LABELS = {
  None: 'Not spicy',
  Mild: 'Mild',
  Medium: 'Medium',
  Hot: 'Hot',
  Extra_Hot: 'Extra hot',
};

/** One dish: name and price share a line at every width; dietary and spice labels are always text. */
@Component({
  selector: 'app-menu-item-row',
  styleUrl: './menu-item-row.component.css',
  template: `
    @let i = item();
    <div class="line">
      <span class="name">{{ i.name }}</span>
      <span class="price">{{ price() }}</span>
    </div>
    <div class="tags">
      @if (i.isVegan) {
        <span class="tag">✓ Vegan</span>
      } @else if (i.isVegetarian) {
        <span class="tag">✓ Vegetarian</span>
      }
      @if (i.isHalal) {
        <span class="tag">✓ Halal</span>
      }
      <span class="tag"
        ><span aria-hidden="true">{{ chillies() }}</span> {{ spice() }}</span
      >
    </div>
  `,
})
export class MenuItemRowComponent {
  readonly item = input.required<MenuItem>();
  protected readonly price = computed(() => formatLkr(this.item().priceLkr));
  protected readonly chillies = computed(() =>
    '🌶'.repeat(SPICE_LEVELS.indexOf(this.item().spiceLevel)),
  );
  protected readonly spice = computed(() => {
    const { spiceLevel } = this.item();
    return spiceLevel === 'None' ? SPICE_LABELS.None : `${SPICE_LABELS[spiceLevel]} spice`;
  });
}
