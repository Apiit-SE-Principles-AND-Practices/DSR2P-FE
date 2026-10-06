import {
  Component,
  computed,
  DestroyRef,
  inject,
  Injector,
  afterNextRender,
  signal,
} from '@angular/core';
import { rxResource, takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize, interval, type Observable } from 'rxjs';
import { AccountService } from '../../core/account.service';
import { AdminService } from '../../core/admin.service';
import type { ApiError } from '../../core/api.interceptor';
import {
  toEntries,
  withoutEntry,
  type ModerationEntry,
  type ModerationKind,
} from '../../core/moderation';
import { InlineErrorComponent } from '../../shared/inline-error.component';
import { SkeletonComponent } from '../../shared/skeleton.component';
import { ToastService } from '../../shared/toast.service';
import { ModerationItemComponent } from './moderation-item.component';

const QUEUE_REFRESH_MS = 60_000;

type Filter = 'all' | ModerationKind;
const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'reviews', label: 'Reviews' },
  { value: 'comments', label: 'Replies' },
];

/**
 * Admin: everything awaiting moderation. An item leaves the list only once the server has confirmed the
 * decision; until then it shows a busy state, and a failure leaves it in place with the reason.
 */
@Component({
  selector: 'app-moderation-queue',
  imports: [InlineErrorComponent, ModerationItemComponent, RouterLink, SkeletonComponent],
  styleUrl: './moderation-queue.component.css',
  host: { '(window:focus)': 'queue.reload()' },
  template: `
    <h1 id="queue-heading" tabindex="-1">Moderation queue ({{ shown().length }})</h1>

    <p><a routerLink="/moderation-guidelines">Moderation guidelines</a></p>

    <fieldset class="segmented">
      <legend class="sr-only">Show</legend>
      @for (option of filters; track option.value) {
        <label class="segment">
          <input
            class="sr-only"
            type="radio"
            name="type"
            [value]="option.value"
            [checked]="filter() === option.value"
            (change)="pick(option.value)"
          />
          <span>{{ option.label }}</span>
        </label>
      }
    </fieldset>

    @if (queue.error() && !queue.value()) {
      <app-inline-error message="Could not load the queue." (retry)="queue.reload()" />
    } @else if (queue.value()) {
      @if (shown().length === 0) {
        <p>Nothing is waiting for moderation.</p>
      } @else {
        <ul class="list">
          @for (entry of shown(); track entry.key) {
            <li>
              <app-moderation-item
                [entry]="entry"
                [restaurant]="names.value()?.get(entry.restaurantId ?? '')"
                [busy]="busy().has(entry.key)"
                [error]="errors()[entry.key] ?? ''"
                (approved)="decide(entry, api.approve(entry.kind, entry.id))"
                (rejected)="decide(entry, api.reject(entry.kind, entry.id, $event))"
              />
            </li>
          }
        </ul>
      }
    } @else {
      <app-skeleton height="var(--space-12)" />
    }
  `,
})
export class ModerationQueueComponent {
  protected readonly api = inject(AdminService);
  private readonly accounts = inject(AccountService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly params = toSignal(inject(ActivatedRoute).queryParamMap);

  protected readonly filters = FILTERS;
  protected readonly filter = computed<Filter>(() => {
    const type = this.params()?.get('type');
    return type === 'reviews' || type === 'comments' ? type : 'all';
  });
  protected readonly busy = signal<ReadonlySet<string>>(new Set());
  protected readonly errors = signal<Partial<Record<string, string>>>({});

  protected readonly queue = rxResource({ loader: () => this.api.queue() });
  protected readonly names = rxResource({ loader: () => this.accounts.restaurantNames$ });
  private readonly entries = computed(() => {
    const queue = this.queue.value();
    return queue ? toEntries(queue) : [];
  });
  protected readonly shown = computed(() =>
    this.entries().filter((e) => this.filter() === 'all' || e.kind === this.filter()),
  );

  constructor() {
    // Two admins should not work from stale lists.
    interval(QUEUE_REFRESH_MS)
      .pipe(takeUntilDestroyed(inject(DestroyRef)))
      .subscribe(() => {
        this.queue.reload();
      });
  }

  protected pick(value: Filter): void {
    void this.router.navigate([], {
      queryParams: { type: value === 'all' ? null : value },
      replaceUrl: true,
    });
  }

  /** Sends the decision; the item is removed only when the server says yes. */
  protected decide(entry: ModerationEntry, request: Observable<unknown>): void {
    this.setBusy(entry.key, true);
    this.errors.update((all) => ({ ...all, [entry.key]: '' }));
    request
      .pipe(
        finalize(() => {
          this.setBusy(entry.key, false);
        }),
      )
      .subscribe({
        next: () => {
          this.remove(entry);
        },
        error: (e: ApiError) => {
          if (e.status === 409) {
            this.toast.show('Already moderated by another admin.', 'info');
            this.remove(entry);
          } else {
            this.errors.update((all) => ({
              ...all,
              [entry.key]: `We couldn’t save that decision. ${e.message} It is still in the queue.`,
            }));
          }
        },
      });
  }

  private setBusy(key: string, on: boolean): void {
    this.busy.update((keys) => {
      const next = new Set(keys);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });
  }

  /** Takes the item out, then moves keyboard focus to the item that took its place (or the heading). */
  private remove(entry: ModerationEntry): void {
    const list = this.shown();
    const left = list.filter((e) => e.key !== entry.key);
    const next = left.at(Math.min(list.indexOf(entry), left.length - 1));
    this.queue.update((queue) => queue && withoutEntry(queue, entry.kind, entry.id));
    afterNextRender(
      () => {
        document.getElementById(next ? `mod-${next.key}` : 'queue-heading')?.focus();
      },
      { injector: this.injector },
    );
  }
}
