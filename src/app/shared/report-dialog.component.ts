import { Component, ElementRef, input, output, viewChild, type OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Asks before reporting a review or reply to the moderators. The API takes no reason, so this is a plain
 * confirmation. Render it with `@if` when needed: it opens as soon as it exists.
 */
@Component({
  selector: 'app-report-dialog',
  imports: [RouterLink],
  styleUrl: './confirm-delete-dialog.component.css',
  template: `
    <dialog #dialog aria-labelledby="report-title" (close)="cancelled.emit()">
      <h2 id="report-title">Report this {{ subject() }}?</h2>
      <p>
        A moderator will check it against the
        <a routerLink="/moderation-guidelines" target="_blank">guidelines</a>. Only report content
        that breaks them.
      </p>
      @if (error()) {
        <p class="field-error" role="alert">{{ error() }}</p>
      }
      <div class="actions">
        <button type="button" class="btn danger" [disabled]="busy()" (click)="confirmed.emit()">
          {{ busy() ? 'Reporting…' : 'Report' }}
        </button>
        <button type="button" class="btn secondary" (click)="dialog.close()">Cancel</button>
      </div>
    </dialog>
  `,
})
export class ReportDialogComponent implements OnInit {
  /** What is being reported, e.g. "review". */
  readonly subject = input.required<string>();
  readonly busy = input(false);
  readonly error = input('');
  readonly confirmed = output();
  readonly cancelled = output();

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  ngOnInit(): void {
    queueMicrotask(() => {
      this.dialog().nativeElement.showModal();
    });
  }
}
