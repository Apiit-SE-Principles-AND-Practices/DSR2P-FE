import { Component, inject } from '@angular/core';
import { ToastService } from './toast.service';

@Component({
  selector: 'app-toast-container',
  styleUrl: './toast-container.component.css',
  template: `
    <div aria-live="polite">
      @for (toast of toastService.toasts(); track toast.id) {
        <div class="toast" [class]="toast.kind">
          <span>{{ toast.message }}</span>
          <button
            type="button"
            class="btn"
            aria-label="Dismiss"
            (click)="toastService.dismiss(toast.id)"
          >
            ×
          </button>
        </div>
      }
    </div>
  `,
})
export class ToastContainerComponent {
  protected readonly toastService = inject(ToastService);
}
