import { Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AccountService } from '../../core/account.service';
import { clearLocalData, downloadJson } from '../../core/privacy';
import { SessionStore } from '../../core/session.store';
import { ConfirmDeleteDialogComponent } from '../../shared/confirm-delete-dialog.component';
import { ToastService } from '../../shared/toast.service';

const CONFIRM_WORD = 'DELETE';

/** Download everything held about you, or delete the account. */
@Component({
  selector: 'app-account-data',
  imports: [ConfirmDeleteDialogComponent, RouterLink],
  template: `
    <h1>My data</h1>
    <p>See <a routerLink="/privacy">what we collect and why</a>.</p>

    <section aria-labelledby="export-title">
      <h2 id="export-title">Download my data</h2>
      <p>
        A JSON file with your name, email, language, and every review and reply you have written.
      </p>
      <button type="button" class="btn" [disabled]="exporting()" (click)="download()">
        {{ exporting() ? 'Preparing…' : 'Download my data' }}
      </button>
      @if (exportError()) {
        <p class="field-error" role="alert">
          We couldn’t prepare your data. Check your connection and try again.
        </p>
      }
    </section>

    <section aria-labelledby="delete-account-title">
      <h2 id="delete-account-title">Delete my account</h2>
      @if (isAdmin()) {
        <p>
          Administrator accounts can’t be deleted here, so the site is never left without one. Ask
          another administrator.
        </p>
      } @else {
        <p>
          Your account, your reviews and your replies are permanently deleted. This cannot be
          undone.
        </p>
        <button type="button" class="btn danger" (click)="confirming.set(true)">
          Delete my account
        </button>
      }
    </section>

    @if (confirming()) {
      <app-confirm-delete-dialog
        heading="Delete your account?"
        [name]="word"
        [impact]="impactLines()"
        [busy]="deleting()"
        (confirmed)="remove()"
        (cancelled)="confirming.set(false)"
      />
    }
  `,
})
export class AccountDataComponent {
  private readonly api = inject(AccountService);
  private readonly session = inject(SessionStore);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  protected readonly word = CONFIRM_WORD;
  protected readonly isAdmin = computed(() => this.session.role() === 'Admin');
  protected readonly exporting = signal(false);
  protected readonly exportError = signal(false);
  protected readonly confirming = signal(false);
  protected readonly deleting = signal(false);

  private readonly counts = rxResource({
    request: () => (this.isAdmin() ? undefined : true),
    loader: () => this.api.counts(),
  });
  /** What goes with the account; `null` while counting (if counting fails, the warning stays general). */
  protected readonly impactLines = computed(() => {
    const counts = this.counts.value();
    if (this.counts.error()) return ['all your reviews and replies'];
    return counts
      ? [`${String(counts.reviews)} reviews`, `${String(counts.replies)} replies`]
      : null;
  });

  protected download(): void {
    this.exporting.set(true);
    this.exportError.set(false);
    this.api
      .exportData()
      .pipe(
        finalize(() => {
          this.exporting.set(false);
        }),
      )
      .subscribe({
        next: (data) => {
          downloadJson('my-data.json', data);
        },
        error: () => {
          this.exportError.set(true);
        },
      });
  }

  protected remove(): void {
    this.deleting.set(true);
    this.api
      .deleteAccount()
      .pipe(
        finalize(() => {
          this.deleting.set(false);
        }),
      )
      .subscribe({
        next: () => {
          this.session.logout();
          clearLocalData(); // drafts, the saved city and language: nothing of this account stays in the browser
          this.toast.show('Your account has been deleted.', 'success');
          void this.router.navigate(['/']);
        },
        error: () => {
          this.toast.show('Could not delete your account. Try again.', 'error');
        },
      });
  }
}
