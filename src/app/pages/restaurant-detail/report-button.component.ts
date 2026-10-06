import { Component, computed, inject, input, signal } from '@angular/core';
import { finalize } from 'rxjs';
import type { ApiError } from '../../core/api.interceptor';
import { readDraft, writeDraft } from '../../core/draft';
import { RequireLogin } from '../../core/require-login';
import { RestaurantService } from '../../core/restaurant.service';
import { SessionStore } from '../../core/session.store';
import { ReportDialogComponent } from '../../shared/report-dialog.component';
import { ToastService } from '../../shared/toast.service';

/**
 * "Report" under a review or reply. Hidden on the user's own content; a Guest is asked to log in. After a
 * report it stays as a disabled "Reported" (remembered for this tab), so one person cannot report it again.
 */
@Component({
  selector: 'app-report-button',
  imports: [ReportDialogComponent],
  template: `
    @if (!own()) {
      <button type="button" class="btn secondary" [disabled]="reported()" (click)="start()">
        {{ reported() ? 'Reported' : 'Report' }}<span class="sr-only"> this {{ subject() }}</span>
      </button>
      @if (confirming()) {
        <app-report-dialog
          [subject]="subject()"
          [busy]="busy()"
          [error]="error()"
          (confirmed)="send()"
          (cancelled)="confirming.set(false)"
        />
      }
    }
  `,
})
export class ReportButtonComponent {
  readonly kind = input.required<'reviews' | 'comments'>();
  readonly id = input.required<number>();
  /** Who wrote it, when the API says. */
  readonly ownerId = input<string>();

  private readonly api = inject(RestaurantService);
  private readonly session = inject(SessionStore);
  private readonly requireLogin = inject(RequireLogin);
  private readonly toast = inject(ToastService);

  protected readonly confirming = signal(false);
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  private readonly key = computed(
    () => `reported:${this.session.user()?.id ?? ''}:${this.kind()}-${String(this.id())}`,
  );
  protected readonly reported = signal(false);
  protected readonly subject = computed(() => (this.kind() === 'reviews' ? 'review' : 'reply'));
  protected readonly own = computed(() => {
    const owner = this.ownerId();
    return owner !== undefined && owner === this.session.user()?.id;
  });

  constructor() {
    queueMicrotask(() => {
      this.reported.set(readDraft(this.key()) !== null);
    });
  }

  protected start(): void {
    this.requireLogin.run('Log in to report this.', () => {
      this.error.set('');
      this.confirming.set(true);
    });
  }

  protected send(): void {
    this.busy.set(true);
    this.api
      .report(this.kind(), this.id())
      .pipe(
        finalize(() => {
          this.busy.set(false);
        }),
      )
      .subscribe({
        next: () => {
          this.done();
        },
        error: (e: ApiError) => {
          if (e.status === 409) this.done();
          else this.error.set(`We couldn’t send your report. ${e.message} Try again.`);
        },
      });
  }

  private done(): void {
    writeDraft(this.key(), '1');
    this.reported.set(true);
    this.confirming.set(false);
    this.toast.show('Thanks — a moderator will review this.', 'success');
  }
}
