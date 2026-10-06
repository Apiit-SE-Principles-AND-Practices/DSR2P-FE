import { Component, computed, input, signal } from '@angular/core';
import { formatDate } from '../../core/format';
import type { Review } from '../../core/restaurant.service';
import { approvedComments, reviewAverage } from '../../core/reviews';
import { RatingDisplayComponent } from '../../shared/rating-display.component';

const REPLIES_SHOWN = 2;

/**
 * One review. Text is rendered as plain text (never HTML) in the language it was written in. Status
 * is never shown: only approved reviews reach this page, and replies are filtered to approved ones.
 */
@Component({
  selector: 'app-review-card',
  imports: [RatingDisplayComponent],
  styleUrl: './review-card.component.css',
  template: `
    @let r = review();
    <article>
      <h3>
        Review · <time [attr.datetime]="r.createdAt">{{ date() }}</time>
      </h3>
      <p class="ratings">
        <app-rating-display [rating]="average()" />
        <span class="detail">
          Food {{ r.foodQualityRating }} · Service {{ r.serviceRating }} · Other {{ r.miscRating }}
        </span>
      </p>
      <p class="text" [lang]="r.language">{{ r.reviewText }}</p>

      @for (image of r.images ?? []; track image.id) {
        <button type="button" class="thumb" (click)="open(viewer, image.imageUrl)">
          <img
            loading="lazy"
            width="96"
            height="96"
            alt="Photo attached to this review"
            [src]="image.imageUrl"
          />
        </button>
      }
      <dialog #viewer aria-label="Review photo">
        <img alt="Photo attached to this review" [src]="photo()" />
        <button type="button" class="btn" (click)="viewer.close()">Close</button>
      </dialog>

      @if (r.response; as response) {
        <section class="response" aria-label="Response from the restaurant">
          <strong>Response from the restaurant</strong>
          <p class="text">{{ response.responseText }}</p>
        </section>
      }

      @if (replies().length > 0) {
        <ul class="replies" aria-label="Replies">
          @for (reply of shownReplies(); track reply.id) {
            <li>
              <p class="text">{{ reply.commentText }}</p>
              <time [attr.datetime]="reply.createdAt">{{ formatDate(reply.createdAt) }}</time>
            </li>
          }
        </ul>
        @if (hidden() > 0) {
          <button type="button" class="btn secondary" (click)="expanded.set(true)">
            Show {{ hidden() }} more {{ hidden() === 1 ? 'reply' : 'replies' }}
          </button>
        }
      }
    </article>
  `,
})
export class ReviewCardComponent {
  readonly review = input.required<Review>();
  protected readonly expanded = signal(false);
  protected readonly photo = signal('');
  protected readonly formatDate = formatDate;

  protected readonly date = computed(() => formatDate(this.review().createdAt));
  protected readonly average = computed(() => reviewAverage(this.review()));
  protected readonly replies = computed(() => approvedComments(this.review()));
  protected readonly shownReplies = computed(() =>
    this.expanded() ? this.replies() : this.replies().slice(0, REPLIES_SHOWN),
  );
  protected readonly hidden = computed(() => this.replies().length - this.shownReplies().length);

  protected open(viewer: HTMLDialogElement, url: string): void {
    this.photo.set(url);
    viewer.showModal();
  }
}
