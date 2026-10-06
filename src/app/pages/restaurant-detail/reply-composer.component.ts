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

const WORDS = {
  reply: { label: 'Your reply', send: 'Send reply', failure: 'We couldn’t send your reply.' },
  response: {
    label: 'Your response as the restaurant',
    send: 'Post response',
    failure: 'We couldn’t post your response.',
  },
};

/**
 * Inline box under a review for a reply (anyone signed in; it waits for a moderator) or, with
 * `kind="response"`, the restaurant's one official response (Admin only). The text is kept as a draft until sent.
 */
@Component({
  selector: 'app-reply-composer',
  imports: [FormErrorComponent],
  template: `
    <form (submit)="$event.preventDefault(); submit()" novalidate>
      <app-form-error [message]="error()" />
      <div class="field">
        <label [for]="'reply-' + reviewId()">{{ words().label }}</label>
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
        {{ busy() ? 'Sending…' : failed() ? 'Retry' : words().send }}
      </button>
      <button type="button" class="btn secondary" (click)="cancelled.emit()">Cancel</button>
    </form>
  `,
})
export class ReplyComposerComponent {
  readonly reviewId = input.required<number>();
  readonly kind = input<'reply' | 'response'>('reply');
  /** Accepted (a reply now waits for a moderator; a response is public at once). */
  readonly sent = output();
  /** Someone else responded first (409): the review should be reloaded to show their response. */
  readonly conflict = output();
  readonly cancelled = output();

  private readonly api = inject(RestaurantService);
  private readonly box = viewChild.required<ElementRef<HTMLTextAreaElement>>('box');
  private readonly draftKey = computed(() => `${this.kind()}-draft:${String(this.reviewId())}`);
  protected readonly words = computed(() => WORDS[this.kind()]);
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
    const text = result.data.commentText;
    (this.kind() === 'response'
      ? this.api.respond(this.reviewId(), text)
      : this.api.reply(this.reviewId(), text)
    )
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
          if (e.status === 409) {
            this.error.set('This review already has a response from the restaurant.');
            this.conflict.emit();
            return;
          }
          this.failed.set(true);
          this.error.set(`${this.words().failure} ${e.message} Your text is saved: press Retry.`);
        },
      });
  }
}
