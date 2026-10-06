import { Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { AccountService, type ModerationStatus } from '../../core/account.service';
import { InlineErrorComponent } from '../../shared/inline-error.component';
import { SkeletonComponent } from '../../shared/skeleton.component';
import { AccountItemRowComponent, type AccountItem } from './account-item-row.component';

type Kind = 'reviews' | 'replies';
type StatusFilter = 'all' | ModerationStatus;

const KINDS: { value: Kind; label: string }[] = [
  { value: 'reviews', label: 'Reviews' },
  { value: 'replies', label: 'Replies' },
];
// The same words as the status badges.
const STATUSES: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'Pending', label: 'Pending review' },
  { value: 'Approved', label: 'Published' },
  { value: 'Rejected', label: 'Rejected' },
];
const EMPTY: Record<Kind, string> = {
  reviews: 'You haven’t written any reviews yet.',
  replies: 'You haven’t written any replies yet.',
};

/** Everything the signed-in user has written, in every status, with the reason for any rejection. */
@Component({
  selector: 'app-my-reviews',
  imports: [AccountItemRowComponent, InlineErrorComponent, SkeletonComponent],
  styleUrl: './my-reviews.component.css',
  template: `
    <h1>My reviews and replies</h1>

    <fieldset class="segmented">
      <legend class="sr-only">Show</legend>
      @for (option of kinds; track option.value) {
        <label class="segment">
          <input
            class="sr-only"
            type="radio"
            name="kind"
            [value]="option.value"
            [checked]="kind() === option.value"
            (change)="kind.set(option.value)"
          />
          <span>{{ option.label }}</span>
        </label>
      }
    </fieldset>

    <div class="field">
      <label for="status">Status</label>
      <select id="status" class="select" #statusBox (change)="pickStatus(statusBox.value)">
        @for (option of statuses; track option.value) {
          <option [value]="option.value" [selected]="option.value === status()">
            {{ option.label }}
          </option>
        }
      </select>
    </div>

    @let all = rows();
    @if (current().error()) {
      <app-inline-error message="Could not load your content." (retry)="current().reload()" />
    } @else if (all) {
      @if (all.length === 0) {
        <p>{{ emptyText() }}</p>
      } @else if (shown().length === 0) {
        <p>None of your {{ kind() }} have this status.</p>
      } @else {
        <ul class="list">
          @for (item of shown(); track item.id) {
            <li><app-account-item-row [item]="item" /></li>
          }
        </ul>
      }
    } @else {
      <app-skeleton height="var(--space-12)" />
    }
  `,
})
export class MyReviewsComponent {
  private readonly api = inject(AccountService);

  protected readonly kinds = KINDS;
  protected readonly statuses = STATUSES;
  protected readonly kind = signal<Kind>('reviews');
  protected readonly status = signal<StatusFilter>('all');

  // Only the visible tab's list is requested; switching tabs fetches it fresh.
  private readonly reviews = rxResource({
    request: () => (this.kind() === 'reviews' ? true : undefined),
    loader: () => this.api.myReviews(),
  });
  private readonly comments = rxResource({
    request: () => (this.kind() === 'replies' ? true : undefined),
    loader: () => this.api.myComments(),
  });
  private readonly names = rxResource({ loader: () => this.api.restaurantNames$ });

  protected readonly current = computed(() =>
    this.kind() === 'reviews' ? this.reviews : this.comments,
  );

  protected readonly rows = computed<AccountItem[] | undefined>(() => {
    if (this.kind() === 'replies') {
      return this.comments.value()?.map((c) => ({
        id: c.id,
        label: 'Reply to a review',
        link: null, // the API gives no way to find the restaurant from a reply
        text: c.commentText,
        createdAt: c.createdAt,
        status: c.status,
        rejectionReason: c.rejectionReason,
      }));
    }
    const names = this.names.value();
    return this.reviews.value()?.map((r) => ({
      id: r.id,
      label: `Review of ${names?.get(r.restaurantId) ?? 'a restaurant'}`,
      link: ['/restaurants', r.restaurantId],
      text: r.reviewText,
      createdAt: r.createdAt,
      status: r.status,
      rejectionReason: r.rejectionReason,
    }));
  });

  protected readonly shown = computed(() =>
    (this.rows() ?? []).filter((row) => this.status() === 'all' || row.status === this.status()),
  );
  protected readonly emptyText = computed(() => EMPTY[this.kind()]);

  protected pickStatus(value: string): void {
    this.status.set(STATUSES.find((option) => option.value === value)?.value ?? 'all');
  }
}
