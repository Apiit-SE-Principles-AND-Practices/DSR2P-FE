import {
  afterNextRender,
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { formatDate } from '../../core/format';
import { RequireLogin } from '../../core/require-login';
import type { Review } from '../../core/restaurant.service';
import { approvedComments, reviewAverage } from '../../core/reviews';
import { SessionStore } from '../../core/session.store';
import { RatingDisplayComponent } from '../../shared/rating-display.component';
import { ReplyComposerComponent } from './reply-composer.component';
import { ReportButtonComponent } from './report-button.component';

const REPLIES_SHOWN = 2;

/**
 * One review. Text is rendered as plain text (never HTML) in the language it was written in. Status
 * is never shown: only approved reviews reach this page, and replies are filtered to approved ones.
 */
@Component({
  selector: 'app-review-card',
  imports: [RatingDisplayComponent, ReplyComposerComponent, ReportButtonComponent],
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
              <app-report-button kind="comments" [id]="reply.id" [ownerId]="reply.userId" />
            </li>
          }
        </ul>
        @if (hidden() > 0) {
          <button type="button" class="btn secondary" (click)="expanded.set(true)">
            Show {{ hidden() }} more {{ hidden() === 1 ? 'reply' : 'replies' }}
          </button>
        }
      }

      <app-report-button kind="reviews" [id]="r.id" [ownerId]="r.userId" />

      @if (canRespond() && !r.response) {
        @if (responding()) {
          <app-reply-composer
            kind="response"
            [reviewId]="r.id"
            (sent)="onResponded()"
            (conflict)="refresh.emit()"
            (cancelled)="closeResponse()"
          />
        } @else {
          <button #respondButton type="button" class="btn secondary" (click)="responding.set(true)">
            Respond as restaurant
          </button>
        }
      }

      @if (replying()) {
        <app-reply-composer [reviewId]="r.id" (sent)="onSent()" (cancelled)="close()" />
      } @else {
        <button #replyButton type="button" class="btn secondary" (click)="startReply()">
          Reply
        </button>
      }
      @if (replySent()) {
        <p class="hint" role="status">
          Your reply has been submitted and will appear once a moderator approves it.
        </p>
      }
    </article>
  `,
})
export class ReviewCardComponent {
  readonly review = input.required<Review>();
  /** Whether this review's reply box is open (the section keeps only one open at a time). */
  readonly replying = input(false);
  readonly replyOpen = output();
  readonly replyClose = output();
  /** The review changed on the server (a response was posted, or someone else's was found): reload it. */
  readonly refresh = output();

  private readonly requireLogin = inject(RequireLogin);
  private readonly session = inject(SessionStore);
  private readonly injector = inject(Injector);
  private readonly replyButton = viewChild<ElementRef<HTMLButtonElement>>('replyButton');
  private readonly respondButton = viewChild<ElementRef<HTMLButtonElement>>('respondButton');
  protected readonly responding = signal(false);
  /** Only an Admin is offered the response box; the server enforces it too. */
  protected readonly canRespond = computed(() => this.session.role() === 'Admin');
  protected readonly replySent = signal(false);
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

  /** A Guest is asked to log in first; nobody else is asked anything. */
  protected startReply(): void {
    this.requireLogin.run('Log in to reply.', () => {
      this.replyOpen.emit();
    });
  }

  protected onSent(): void {
    this.replySent.set(true);
    this.close();
  }

  /** Closes the box and puts the keyboard focus back on the Reply button. */
  protected close(): void {
    this.replyClose.emit();
    afterNextRender(() => this.replyButton()?.nativeElement.focus(), { injector: this.injector });
  }

  protected onResponded(): void {
    this.responding.set(false);
    this.refresh.emit();
  }

  protected closeResponse(): void {
    this.responding.set(false);
    afterNextRender(() => this.respondButton()?.nativeElement.focus(), { injector: this.injector });
  }

  protected open(viewer: HTMLDialogElement, url: string): void {
    this.photo.set(url);
    viewer.showModal();
  }
}
