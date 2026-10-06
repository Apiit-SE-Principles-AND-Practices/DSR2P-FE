import { HttpClient } from '@angular/common/http';
import { Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { parseMarkdown } from '../core/markdown';
import { GUIDELINE_CATEGORIES } from '../core/moderation-guidelines';
import { InlineErrorComponent } from '../shared/inline-error.component';
import { SkeletonComponent } from '../shared/skeleton.component';

/** An absolute address, so the API interceptor leaves it alone: the file ships with the app, not the API. */
const GUIDELINES_URL = new URL('content/moderation-guidelines.md', document.baseURI).href;

/** The moderation rules, shown from `content/moderation-guidelines.md` so editing them is a content change. */
@Component({
  selector: 'app-moderation-guidelines',
  imports: [InlineErrorComponent, SkeletonComponent],
  template: `
    @if (text.error()) {
      <app-inline-error message="Could not load the guidelines." (retry)="text.reload()" />
    } @else if (text.value() !== undefined) {
      @for (block of blocks(); track $index) {
        @switch (block.tag) {
          @case ('h1') {
            <h1>{{ block.text }}</h1>
          }
          @case ('h2') {
            <h2>{{ block.text }}</h2>
          }
          @case ('h3') {
            <h3>{{ block.text }}</h3>
          }
          @case ('ul') {
            <ul>
              @for (item of block.items; track item) {
                <li>{{ item }}</li>
              }
            </ul>
          }
          @default {
            <p>{{ block.text }}</p>
          }
        }
      }
      <h2>Reasons for rejection</h2>
      <ul>
        @for (category of categories; track category.reason) {
          <li>
            <strong>{{ category.reason }}</strong
            >: {{ category.meaning }}
          </li>
        }
      </ul>
    } @else {
      <app-skeleton height="var(--space-12)" />
    }
  `,
})
export class ModerationGuidelinesComponent {
  private readonly http = inject(HttpClient);
  protected readonly categories = GUIDELINE_CATEGORIES;
  protected readonly text = rxResource({
    loader: () => this.http.get(GUIDELINES_URL, { responseType: 'text' }),
  });
  protected readonly blocks = computed(() => parseMarkdown(this.text.value() ?? ''));
}
