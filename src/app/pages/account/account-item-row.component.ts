import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { ModerationStatus } from '../../core/account.service';
import { formatDate } from '../../core/format';
import { StatusBadgeComponent } from '../../shared/status-badge.component';

/** One of the user's own reviews or replies, in the shape the list needs. */
export interface AccountItem {
  id: number;
  /** "Review of Sea Spray" or "Reply to a review". */
  label: string;
  /** Link to the restaurant page, when it is known. */
  link: string[] | null;
  text: string;
  createdAt: string;
  status: ModerationStatus;
  rejectionReason: string | null;
}

@Component({
  selector: 'app-account-item-row',
  imports: [RouterLink, StatusBadgeComponent],
  styleUrl: './account-item-row.component.css',
  template: `
    @let i = item();
    <h3>
      @if (i.link) {
        <a [routerLink]="i.link">{{ i.label }}</a>
      } @else {
        {{ i.label }}
      }
      · <time [attr.datetime]="i.createdAt">{{ date() }}</time>
    </h3>
    <app-status-badge [status]="i.status" />
    <p class="excerpt">{{ i.text }}</p>
    @if (i.status === 'Rejected') {
      <p class="reason">Reason: {{ i.rejectionReason || 'No reason recorded' }}</p>
    }
  `,
})
export class AccountItemRowComponent {
  readonly item = input.required<AccountItem>();
  protected readonly date = computed(() => formatDate(this.item().createdAt));
}
