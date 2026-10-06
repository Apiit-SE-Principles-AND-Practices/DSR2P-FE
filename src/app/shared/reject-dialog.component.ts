import {
  Component,
  ElementRef,
  input,
  output,
  signal,
  viewChild,
  type OnInit,
} from '@angular/core';

/**
 * Asks why something is being rejected: the reason is required and is shown to its author.
 * Render it with `@if` when needed: it opens as soon as it exists.
 */
@Component({
  selector: 'app-reject-dialog',
  styleUrl: './confirm-delete-dialog.component.css',
  template: `
    <dialog #dialog aria-labelledby="reject-title" (close)="cancelled.emit()">
      <h2 id="reject-title">Reject {{ subject() }}</h2>
      <div class="field">
        <label for="reject-reason">Reason (shown to the author)</label>
        <textarea
          id="reject-reason"
          class="select"
          rows="4"
          [value]="reason()"
          #box
          (input)="reason.set(box.value)"
        ></textarea>
      </div>
      <div class="actions">
        <button
          type="button"
          class="btn danger"
          [disabled]="busy() || reason().trim() === ''"
          (click)="rejected.emit(reason().trim())"
        >
          {{ busy() ? 'Rejecting…' : 'Reject' }}
        </button>
        <button type="button" class="btn secondary" (click)="dialog.close()">Cancel</button>
      </div>
    </dialog>
  `,
})
export class RejectDialogComponent implements OnInit {
  /** What is being rejected, e.g. "this review". */
  readonly subject = input.required<string>();
  readonly busy = input(false);
  readonly rejected = output<string>();
  readonly cancelled = output();

  protected readonly reason = signal('');
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  ngOnInit(): void {
    queueMicrotask(() => {
      this.dialog().nativeElement.showModal();
    });
  }
}
