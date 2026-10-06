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
 * "Are you sure?" for deleting something with dependants. Lists what goes with it and only enables
 * Delete once the exact name is typed. Render it with `@if` when needed: it opens as soon as it exists.
 */
@Component({
  selector: 'app-confirm-delete-dialog',
  styleUrl: './confirm-delete-dialog.component.css',
  template: `
    <dialog #dialog aria-labelledby="delete-title" (close)="cancelled.emit()">
      <h2 id="delete-title">{{ heading() ?? 'Delete ' + name() + '?' }}</h2>
      @if (impact(); as lines) {
        <p>This cannot be undone. It also permanently deletes:</p>
        <ul>
          @for (line of lines; track line) {
            <li>{{ line }}</li>
          }
        </ul>
      } @else {
        <p>Counting what will be deleted…</p>
      }
      <div class="field">
        <label for="confirm-name"
          >Type <strong>{{ name() }}</strong> to confirm</label
        >
        <input
          id="confirm-name"
          autocomplete="off"
          [value]="typed()"
          #box
          (input)="typed.set(box.value)"
        />
      </div>
      <div class="actions">
        <button
          type="button"
          class="btn danger"
          [disabled]="busy() || typed().trim() !== name()"
          (click)="confirmed.emit()"
        >
          {{ busy() ? 'Deleting…' : 'Delete' }}
        </button>
        <button type="button" class="btn secondary" (click)="dialog.close()">Cancel</button>
      </div>
    </dialog>
  `,
})
export class ConfirmDeleteDialogComponent implements OnInit {
  readonly name = input.required<string>();
  /** Replaces the default "Delete {name}?" title. */
  readonly heading = input<string>();
  /** What goes with it, one line each; `null` while still counting. */
  readonly impact = input<string[] | null>(null);
  readonly busy = input(false);
  readonly confirmed = output();
  readonly cancelled = output();

  protected readonly typed = signal('');
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  ngOnInit(): void {
    queueMicrotask(() => {
      this.dialog().nativeElement.showModal();
    });
  }
}
