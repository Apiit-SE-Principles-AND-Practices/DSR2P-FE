import {
  Component,
  computed,
  ElementRef,
  input,
  output,
  signal,
  viewChild,
  type OnInit,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  REJECTION_MAX,
  REJECTION_PRESETS,
  rejectionReasonSchema,
} from './validation/rejection-reason.schema';

/**
 * Asks why something is being rejected: the reason is required and is shown to its author.
 * Render it with `@if` when needed: it opens as soon as it exists.
 */
@Component({
  selector: 'app-reject-dialog',
  imports: [RouterLink],
  styleUrl: './confirm-delete-dialog.component.css',
  template: `
    <dialog #dialog aria-labelledby="reject-title" (close)="cancelled.emit()">
      <h2 id="reject-title">Reject {{ subject() }}</h2>
      <p>
        <a routerLink="/moderation-guidelines" target="_blank"
          >See the guidelines (opens in a new tab)</a
        >
      </p>
      <div class="presets" role="group" aria-label="Common reasons">
        @for (preset of presets; track preset) {
          <button type="button" class="btn secondary" (click)="reason.set(preset)">
            {{ preset }}
          </button>
        }
      </div>
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
        <span class="hint">{{ reason().length }} / {{ max }}</span>
      </div>
      <div class="actions">
        <button
          type="button"
          class="btn danger"
          [disabled]="busy() || !valid().success"
          (click)="submit()"
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

  protected readonly presets = REJECTION_PRESETS;
  protected readonly max = REJECTION_MAX;
  protected readonly reason = signal('');
  protected readonly valid = computed(() => rejectionReasonSchema.safeParse(this.reason()));
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  protected submit(): void {
    const result = this.valid();
    if (result.success) this.rejected.emit(result.data);
  }

  ngOnInit(): void {
    queueMicrotask(() => {
      this.dialog().nativeElement.showModal();
    });
  }
}
