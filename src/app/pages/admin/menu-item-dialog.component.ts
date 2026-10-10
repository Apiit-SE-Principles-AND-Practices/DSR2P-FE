import { Component, ElementRef, input, output, viewChild, type OnInit } from '@angular/core';
import type { Category } from '../../core/category.service';
import type { MenuItem } from '../../core/menu';
import { MenuItemFormComponent, type StagedDish } from './menu-item-form.component';

/** The dish form in a popup. Render it with `@if`: it opens as soon as it exists and reports `closed` when dismissed. */
@Component({
  selector: 'app-menu-item-dialog',
  imports: [MenuItemFormComponent],
  styleUrl: './menu-item-dialog.component.css',
  template: `
    <dialog #dialog [attr.aria-label]="item() ? 'Edit dish' : 'Add a dish'" (close)="closed.emit()">
      <app-menu-item-form
        [restaurantId]="restaurantId()"
        [item]="item()"
        [categories]="categories()"
        (saved)="saved.emit($event)"
        (staged)="staged.emit($event)"
        (cancelled)="dialog.close()"
      />
    </dialog>
  `,
})
export class MenuItemDialogComponent implements OnInit {
  /** Leave unset on a restaurant that does not exist yet: the dish is handed back as `staged`. */
  readonly restaurantId = input<string | null>(null);
  readonly item = input<MenuItem | null>(null);
  readonly categories = input.required<Category[]>();
  readonly saved = output<MenuItem>();
  readonly staged = output<StagedDish>();
  readonly closed = output();

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  ngOnInit(): void {
    queueMicrotask(() => {
      const dialog = this.dialog().nativeElement;
      if (dialog.isConnected) dialog.showModal(); // already gone if the dish was saved straight away
    });
  }
}
