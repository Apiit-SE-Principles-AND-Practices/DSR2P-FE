import { Component, input } from '@angular/core';
import { PRICE_BANDS, type PriceBand } from '../core/search-params.service';

/** "Rs", "Rs Rs" or "Rs Rs Rs", read out as the band name. Nothing when the price is unknown. */
@Component({
  selector: 'app-price-band',
  template: `
    @let value = band();
    @if (value) {
      <span role="img" [attr.aria-label]="'Price band: ' + value.toLowerCase()">{{
        symbols(value)
      }}</span>
    }
  `,
})
export class PriceBandComponent {
  readonly band = input.required<PriceBand | null>();

  protected symbols(value: PriceBand): string {
    return Array<string>(PRICE_BANDS.indexOf(value) + 1)
      .fill('Rs')
      .join(' ');
  }
}
