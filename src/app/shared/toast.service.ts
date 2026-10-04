import { Injectable, signal } from '@angular/core';

export type ToastKind = 'info' | 'success' | 'error';
export interface Toast {
  id: number;
  message: string;
  kind: ToastKind;
}

export const TOAST_DURATION_MS = 5000;

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<Toast[]>([]);
  private nextId = 0;

  show(message: string, kind: ToastKind = 'info'): void {
    const id = this.nextId++;
    this.toasts.update((list) => [...list, { id, message, kind }]);
    setTimeout(() => {
      this.dismiss(id);
    }, TOAST_DURATION_MS);
  }

  dismiss(id: number): void {
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }
}
