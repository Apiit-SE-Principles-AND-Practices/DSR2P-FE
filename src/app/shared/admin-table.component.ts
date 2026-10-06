import { NgTemplateOutlet } from '@angular/common';
import { Component, input, type TemplateRef } from '@angular/core';
import { matchesBreakpoint } from '../core/breakpoint';

export interface AdminColumn<T> {
  label: string;
  value: (row: T) => string | number;
}

/**
 * Admin lists. From 640px a real table; below that one card per row, every value labelled with its
 * column name. Pass an `actions` template (`<ng-template let-row>`) for per-row buttons.
 */
@Component({
  selector: 'app-admin-table',
  imports: [NgTemplateOutlet],
  styleUrl: './admin-table.component.css',
  template: `
    @if (rows().length === 0) {
      <p>{{ empty() }}</p>
    } @else if (isTablet()) {
      <table>
        <caption class="sr-only">
          {{
            caption()
          }}
        </caption>
        <thead>
          <tr>
            @for (column of columns(); track column.label) {
              <th scope="col">{{ column.label }}</th>
            }
            @if (actions()) {
              <th scope="col"><span class="sr-only">Actions</span></th>
            }
          </tr>
        </thead>
        <tbody>
          @for (row of rows(); track rowId()(row)) {
            <tr>
              @for (column of columns(); track column.label) {
                <td>{{ column.value(row) }}</td>
              }
              @if (actions(); as template) {
                <td>
                  <ng-container *ngTemplateOutlet="template; context: { $implicit: row }" />
                </td>
              }
            </tr>
          }
        </tbody>
      </table>
    } @else {
      <ul class="cards" [attr.aria-label]="caption()">
        @for (row of rows(); track rowId()(row)) {
          <li>
            <dl>
              @for (column of columns(); track column.label) {
                <div>
                  <dt>{{ column.label }}</dt>
                  <dd>{{ column.value(row) }}</dd>
                </div>
              }
            </dl>
            @if (actions(); as template) {
              <div class="actions">
                <ng-container *ngTemplateOutlet="template; context: { $implicit: row }" />
              </div>
            }
          </li>
        }
      </ul>
    }
  `,
})
export class AdminTableComponent<T> {
  readonly columns = input.required<AdminColumn<T>[]>();
  readonly rows = input.required<T[]>();
  /** A stable id per row, so rows keep their state when the list changes. */
  readonly rowId = input.required<(row: T) => string | number>();
  /** Names the table for screen readers, e.g. "Restaurants". */
  readonly caption = input.required<string>();
  readonly empty = input('Nothing to show yet.');
  readonly actions = input<TemplateRef<{ $implicit: T }>>();

  protected readonly isTablet = matchesBreakpoint('tablet');
}
