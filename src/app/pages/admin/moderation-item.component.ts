import { Component, computed, effect, input, output, signal } from '@angular/core';
import { formatDate } from '../../core/format';
import type { ModerationEntry } from '../../core/moderation';
import { RejectDialogComponent } from '../../shared/reject-dialog.component';

/** One pending review or reply with what a moderator needs to decide. Decisions go up; the page owns the list. */
@Component({
  selector: 'app-moderation-item',
  imports: [RejectDialogComponent],
  styleUrl: './moderation-item.component.css',
  template: `
    @let e = entry();
    <h3 [id]="'mod-' + e.key" tabindex="-1">
      <span class="badge">{{ e.kind === 'reviews' ? 'Review' : 'Reply' }}</span>
      @if (e.reported) {
        <span class="badge reported">Reported ({{ e.reportCount }})</span>
      }
      {{ restaurant() ?? (e.kind === 'reviews' ? 'A restaurant' : 'Reply to a review') }}
      · <time [attr.datetime]="e.createdAt">{{ date() }}</time>
    </h3>
    @if (e.ratings; as r) {
      <p class="ratings">Food {{ r.food }} · Service {{ r.service }} · Other {{ r.other }}</p>
    }
    @if (e.parentText; as parent) {
      <blockquote class="parent">{{ parent }}</blockquote>
    }
    <p class="text" [attr.lang]="e.language">{{ e.text }}</p>
    @for (photo of e.photos; track photo) {
      <img class="photo" alt="Photo attached to the review" [src]="photo" />
    }
    @if (error()) {
      <p class="field-error" role="alert">{{ error() }}</p>
    }
    <div class="actions">
      <button type="button" class="btn" [disabled]="busy()" (click)="approved.emit()">
        {{ busy() && !rejecting() ? 'Approving…' : 'Approve' }}
      </button>
      <button type="button" class="btn danger" [disabled]="busy()" (click)="rejecting.set(true)">
        Reject
      </button>
    </div>
    @if (rejecting()) {
      <app-reject-dialog
        [subject]="e.kind === 'reviews' ? 'this review' : 'this reply'"
        [busy]="busy()"
        (rejected)="rejected.emit($event)"
        (cancelled)="rejecting.set(false)"
      />
    }
  `,
})
export class ModerationItemComponent {
  readonly entry = input.required<ModerationEntry>();
  readonly restaurant = input<string>();
  readonly busy = input(false);
  readonly error = input('');
  readonly approved = output();
  readonly rejected = output<string>();

  protected readonly rejecting = signal(false);
  protected readonly date = computed(() => formatDate(this.entry().createdAt));

  constructor() {
    // Once the server has answered (an error leaves the item in place), the dialog gets out of the way.
    effect(() => {
      if (!this.busy()) this.rejecting.set(false);
    });
  }
}
