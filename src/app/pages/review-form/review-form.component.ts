import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { flattenError } from 'zod/mini';
import type { ApiError } from '../../core/api.interceptor';
import { uiLanguage } from '../../core/languages';
import { RestaurantService } from '../../core/restaurant.service';
import { FormErrorComponent } from '../../shared/form-error.component';
import { PhotoPickerComponent } from '../../shared/photo-picker.component';
import { StarRatingInputComponent } from '../../shared/star-rating-input.component';
import { REVIEW_MAX, reviewSchema } from '../../shared/validation/review.schema';

interface Draft {
  food: number | null;
  service: number | null;
  misc: number | null;
  text: string;
  itemId: number | null;
}

/** Write a review. Everything typed is kept in sessionStorage, so a failure, reload or re-login loses nothing. */
@Component({
  selector: 'app-review-form',
  imports: [FormErrorComponent, PhotoPickerComponent, StarRatingInputComponent],
  template: `
    <h1>Write a review</h1>
    @if (restaurant.value(); as r) {
      <p>{{ r.name }}</p>
    }
    <form (submit)="$event.preventDefault(); submit()" novalidate>
      <app-form-error [message]="error()" />

      <app-star-rating-input
        label="Food quality"
        name="food"
        [(value)]="food"
        [error]="errorOf('foodQualityRating')"
      />
      <app-star-rating-input
        label="Service"
        name="service"
        [(value)]="service"
        [error]="errorOf('serviceRating')"
      />
      <app-star-rating-input
        label="Other"
        name="misc"
        [(value)]="misc"
        [error]="errorOf('miscRating')"
      />

      @if (dishes().length > 0) {
        <div class="field">
          <label for="dish">Which dish? (optional)</label>
          <select id="dish" class="select" #dish (change)="pickDish(dish.value)">
            <option value="">Not about a specific dish</option>
            @for (item of dishes(); track item.id) {
              <option [value]="item.id" [selected]="item.id === itemId()">{{ item.name }}</option>
            }
          </select>
        </div>
      }

      <div class="field">
        <label for="review-text">Your review <span class="hint">(required)</span></label>
        <textarea
          id="review-text"
          class="select"
          rows="6"
          aria-describedby="review-count"
          [attr.aria-invalid]="!!errorOf('reviewText')"
          [value]="text()"
          #box
          (input)="text.set(box.value)"
        ></textarea>
        <span id="review-count" class="hint">{{ text().length }} / {{ max }}</span>
        @if (errorOf('reviewText'); as message) {
          <span class="field-error">{{ message }}</span>
        }
      </div>

      <app-photo-picker [(photo)]="photo" [(rights)]="rights" />

      <button class="btn" type="submit" [disabled]="busy() || !canSubmit()">
        {{ busy() ? 'Submitting…' : failed() ? 'Retry' : 'Submit review' }}
      </button>
      @if (!valid()) {
        <p class="hint">Choose all three ratings and write your review to submit it.</p>
      } @else if (!canSubmit()) {
        <p class="hint">Confirm you may share your photo to submit, or remove it.</p>
      }
    </form>
  `,
})
export class ReviewFormComponent {
  private readonly api = inject(RestaurantService);
  private readonly router = inject(Router);
  private readonly restaurantId = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? '';
  private readonly draftKey = `review-draft:${this.restaurantId}`;
  private readonly language = uiLanguage();
  private submitted = false;

  protected readonly max = REVIEW_MAX;
  protected readonly food = signal<number | null>(null);
  protected readonly service = signal<number | null>(null);
  protected readonly misc = signal<number | null>(null);
  protected readonly text = signal('');
  protected readonly itemId = signal<number | null>(null);
  protected readonly photo = signal<File | null>(null); // not kept in the draft: files cannot be stored there
  protected readonly rights = signal(false);

  protected readonly busy = signal(false);
  protected readonly failed = signal(false);
  protected readonly error = signal('');
  private readonly serverErrors = signal<Partial<Record<string, string>>>({});

  protected readonly restaurant = rxResource({ loader: () => this.api.get(this.restaurantId) });
  private readonly menu = rxResource({ loader: () => this.api.menu(this.restaurantId) });
  protected readonly dishes = computed(() => this.menu.value() ?? []);

  /** What the schema checks: the same rules the API and the other forms use. */
  private readonly result = computed(() =>
    reviewSchema.safeParse({
      foodQualityRating: this.food(),
      serviceRating: this.service(),
      miscRating: this.misc(),
      reviewText: this.text(),
      itemId: this.itemId(),
      language: this.language,
    }),
  );
  protected readonly valid = computed(() => this.result().success);
  /** A chosen photo also needs the "this is mine to share" confirmation. */
  protected readonly canSubmit = computed(() => this.valid() && (!this.photo() || this.rights()));

  constructor() {
    this.restoreDraft();
    // Autosave on every change; editing anything also dismisses the server's field errors.
    effect(() => {
      const draft: Draft = {
        food: this.food(),
        service: this.service(),
        misc: this.misc(),
        text: this.text(),
        itemId: this.itemId(),
      };
      untracked(() => {
        this.serverErrors.set({});
        if (!this.submitted) this.store(JSON.stringify(draft));
      });
    });
  }

  /** The server's message for the field; the schema's only for text that is too long (the button covers the rest). */
  protected errorOf(field: string): string | undefined {
    const result = this.result();
    const tooLong = field === 'reviewText' && this.text().length > REVIEW_MAX;
    const messages: Partial<Record<string, string[]>> = result.success
      ? {}
      : flattenError(result.error).fieldErrors;
    const local = tooLong ? messages[field]?.[0] : undefined;
    return this.serverErrors()[field] ?? local;
  }

  protected pickDish(value: string): void {
    this.itemId.set(value === '' ? null : Number(value));
  }

  protected submit(): void {
    const result = this.result();
    if (!result.success || !this.canSubmit() || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.api
      .submitReview(this.restaurantId, result.data, this.photo())
      .pipe(
        finalize(() => {
          this.busy.set(false);
        }),
      )
      .subscribe({
        next: () => {
          this.submitted = true;
          this.store(null);
          // Nothing is added to the public list: the review waits for a moderator.
          void this.router.navigate(['/restaurants', this.restaurantId], {
            state: { reviewSubmitted: true },
          });
        },
        error: (e: ApiError) => {
          this.failed.set(true);
          this.serverErrors.set(e.fieldErrors ?? {});
          this.error.set(
            `We couldn’t send your review. ${e.message} Your text is saved: check the details and press Retry.`,
          );
        },
      });
  }

  private restoreDraft(): void {
    try {
      const saved = sessionStorage.getItem(this.draftKey);
      if (!saved) return;
      const draft = JSON.parse(saved) as Draft;
      this.food.set(draft.food);
      this.service.set(draft.service);
      this.misc.set(draft.misc);
      this.text.set(draft.text);
      this.itemId.set(draft.itemId);
    } catch {
      // an unreadable draft is simply ignored
    }
  }

  private store(value: string | null): void {
    try {
      if (value === null) sessionStorage.removeItem(this.draftKey);
      else sessionStorage.setItem(this.draftKey, value);
    } catch {
      // storage can be blocked; the form still works
    }
  }
}
