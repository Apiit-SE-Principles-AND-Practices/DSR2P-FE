import { Component, effect, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { debounceTime } from 'rxjs';
import { SearchParamsService } from '../core/search-params.service';

export const TYPING_DEBOUNCE_MS = 300;

/** Name search in the header. Enter searches at once; on the results page typing refines live. */
@Component({
  selector: 'app-search-input',
  imports: [ReactiveFormsModule],
  styleUrl: './search-input.component.css',
  template: `
    <form role="search" (submit)="$event.preventDefault(); apply(false)">
      <input
        class="select"
        type="search"
        enterkeyhint="search"
        aria-label="Search restaurants"
        placeholder="Search restaurants"
        [formControl]="query"
      />
    </form>
  `,
})
export class SearchInputComponent {
  private readonly search = inject(SearchParamsService);
  private readonly router = inject(Router);
  protected readonly query = new FormControl('', { nonNullable: true });

  constructor() {
    // The URL is the source of truth, so Back/Forward and shared links fill the box.
    effect(() => {
      this.query.setValue(this.search.params().q ?? '', { emitEvent: false });
    });
    this.query.valueChanges
      .pipe(debounceTime(TYPING_DEBOUNCE_MS), takeUntilDestroyed())
      .subscribe(() => {
        if (this.router.url.startsWith('/search')) this.apply(true);
      });
  }

  /** Searches the typed name, keeping the city and filters. */
  protected apply(replaceUrl: boolean): void {
    const text = this.query.value.trim();
    void this.search.update({ q: text.length > 0 ? text : undefined }, replaceUrl);
  }
}
