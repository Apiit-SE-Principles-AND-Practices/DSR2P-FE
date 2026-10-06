import { Component, input, model } from '@angular/core';

const STARS = [1, 2, 3, 4, 5];

/** A 1–5 rating as five radio buttons, so only whole numbers 1–5 can be chosen and arrow keys work. */
@Component({
  selector: 'app-star-rating-input',
  styleUrl: './star-rating-input.component.css',
  template: `
    <fieldset>
      <legend>{{ label() }} <span class="required">(required)</span></legend>
      <div class="stars">
        @for (n of stars; track n) {
          <label class="star">
            <input
              class="sr-only"
              type="radio"
              [name]="name()"
              [value]="n"
              [checked]="value() === n"
              (change)="value.set(n)"
            />
            <span aria-hidden="true">{{ (value() ?? 0) >= n ? '★' : '☆' }}</span>
            <span class="sr-only">{{ n }} {{ n === 1 ? 'star' : 'stars' }}</span>
          </label>
        }
      </div>
      @if (error()) {
        <span class="field-error">{{ error() }}</span>
      }
    </fieldset>
  `,
})
export class StarRatingInputComponent {
  readonly label = input.required<string>();
  /** Radio group name; unique per rating on the page. */
  readonly name = input.required<string>();
  readonly value = model<number | null>(null);
  readonly error = input<string>();
  protected readonly stars = STARS;
}
