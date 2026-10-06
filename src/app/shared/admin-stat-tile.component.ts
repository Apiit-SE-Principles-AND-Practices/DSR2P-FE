import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * A dashboard figure. With an `action` and a count above 0 it turns into a call to act: the attention
 * colours, the words "Needs review" and a link, so the flag never relies on colour alone.
 */
@Component({
  selector: 'app-admin-stat-tile',
  imports: [RouterLink],
  styleUrl: './admin-stat-tile.component.css',
  template: `
    <div class="tile" [class.attention]="flagged()">
      <p class="label">{{ label() }}</p>
      <p class="value">{{ value() }}</p>
      @if (flagged(); as action) {
        <p class="flag">Needs review</p>
        <a [routerLink]="action.path" [queryParams]="action.query"
          >Review now →<span class="sr-only"> {{ label() }}</span></a
        >
      }
    </div>
  `,
})
export class AdminStatTileComponent {
  readonly label = input.required<string>();
  readonly value = input.required<number>();
  /** Where the "Review now" link goes; the tile is flagged while `value` is above 0. */
  readonly action = input<{ path: string; query: Record<string, string> }>();

  protected flagged(): { path: string; query: Record<string, string> } | undefined {
    return this.value() > 0 ? this.action() : undefined;
  }
}
