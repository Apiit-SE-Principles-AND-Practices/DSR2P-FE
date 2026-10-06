import {
  afterNextRender,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { finalize } from 'rxjs';
import type { ApiError } from '../../core/api.interceptor';
import { readDraft, writeDraft } from '../../core/draft';
import { RestaurantService } from '../../core/restaurant.service';
import { FormErrorComponent } from '../../shared/form-error.component';
import { REPLY_MAX, replySchema } from '../../shared/validation/reply.schema';

/** Inline reply box under a review. The text is kept as a draft until it is sent. */
@Component({
  selector: 'app-reply-composer',
  imports: [FormErrorComponent],
  template: `
    <form (submit)="$event.preventDefault(); submit()" novalidate>
      <app-form-error [message]="error()" />
      <div class="field">
        <label [for]="'reply-' + reviewId()">Your reply</label>
        <textarea
          class="select"
          rows="3"
          #box
          [id]="'reply-' + reviewId()"
          [attr.aria-describedby]="'reply-count-' + reviewId()"
          [value]="text()"
          (input)="text.set(box.value)"
        ></textarea>
        <span class="hint" [id]="'reply-count-' + reviewId()">{{ text().length }} / {{ max }}</span>
        @if (tooLong()) {
          <span class="field-error">Use {{ max }} characters or fewer.</span>
        }
      </div>
      <button class="btn" type="submit" [disabled]="busy() || !valid()">
        {{ busy() ? 'Sending…' : failed() ? 'Retry' : 'Send reply' }}
      </button>
      <button type="button" class="btn secondary" (click)="cancelled.emit()">Cancel</button>
    </form>
  `,
})
export class ReplyComposerComponent {
  readonly reviewId = input.required<number>();
  /** The reply was accepted (it now waits for a moderator). */
  readonly sent = output();
  readonly cancelled = output();

  private readonly api = inject(RestaurantService);
  private readonly box = viewChild.required<ElementRef<HTMLTextAreaElement>>('box');
  private readonly draftKey = computed(() => `reply-draft:${String(this.reviewId())}`);
  private restored = false;

  protected readonly max = REPLY_MAX;
  protected readonly text = signal('');
  protected readonly busy = signal(false);
  protected readonly failed = signal(false);
  protected readonly error = signal('');
  protected readonly valid = computed(
    () => replySchema.safeParse({ commentText: this.text() }).success,
  );
  protected readonly tooLong = computed(() => this.text().length > REPLY_MAX);

  constructor() {
    afterNextRender(() => {
      this.text.set(readDraft(this.draftKey()) ?? '');
      this.restored = true;
      this.box().nativeElement.focus(); // the cursor goes straight into the box
    });
    // Autosave as you type, but only once the saved draft has been loaded (or it would be overwritten).
    effect(() => {
      const text = this.text();
      if (this.restored) writeDraft(this.draftKey(), text);
    });
  }

  protected submit(): void {
    const result = replySchema.safeParse({ commentText: this.text() });
    if (!result.success || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.api
      .reply(this.reviewId(), result.data.commentText)
      .pipe(
        finalize(() => {
          this.busy.set(false);
        }),
      )
      .subscribe({
        next: () => {
          writeDraft(this.draftKey(), null);
          this.sent.emit(); // nothing is added to the thread: only approved replies are shown
        },
        error: (e: ApiError) => {
          this.failed.set(true);
          this.error.set(
            `We couldn’t send your reply. ${e.message} Your text is saved: press Retry.`,
          );
        },
      });
  }
}
