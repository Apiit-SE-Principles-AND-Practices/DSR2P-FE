import { Component, computed, input } from '@angular/core';

/** One labelled rating out of 5: a bar plus the numeral, so the value is never colour or length alone. */
@Component({
  selector: 'app-rating-bar',
  styleUrl: './rating-bar.component.css',
  template: `
    <span class="label">{{ label() }}</span>
    <span
      class="track"
      role="meter"
      aria-valuemin="0"
      aria-valuemax="5"
      [attr.aria-valuenow]="value()"
      [attr.aria-label]="label() + ': ' + value().toFixed(1) + ' out of 5'"
    >
      <span class="fill" [style.width.%]="percent()"></span>
    </span>
    <strong>{{ value().toFixed(1) }}</strong>
  `,
})
export class RatingBarComponent {
  readonly label = input.required<string>();
  readonly value = input.required<number>();
  protected readonly percent = computed(() => (this.value() / 5) * 100);
}
