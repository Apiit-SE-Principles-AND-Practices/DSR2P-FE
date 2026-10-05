import { Component, effect, ElementRef, inject, viewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { RequireLogin } from '../core/require-login';

/** The "Log in to …" dialog. A native modal <dialog> gives the focus trap, Esc and focus return. */
@Component({
  selector: 'app-login-prompt',
  imports: [RouterLink],
  styleUrl: './login-prompt.component.css',
  template: `
    <dialog #dialog aria-labelledby="login-prompt-title" (close)="requireLogin.dismiss()">
      <h2 id="login-prompt-title">Log in required</h2>
      <p>{{ requireLogin.prompt() }}</p>
      <div class="actions">
        <a
          class="btn"
          routerLink="/login"
          [queryParams]="{ returnTo: router.url }"
          (click)="dialog.close()"
          >Log in</a
        >
        <a
          class="btn secondary"
          routerLink="/register"
          [queryParams]="{ returnTo: router.url }"
          (click)="dialog.close()"
          >Register</a
        >
        <button type="button" class="btn secondary" (click)="dialog.close()">Cancel</button>
      </div>
    </dialog>
  `,
})
export class LoginPromptComponent {
  protected readonly requireLogin = inject(RequireLogin);
  protected readonly router = inject(Router);
  private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    effect(() => {
      const dialog = this.dialog()?.nativeElement;
      if (!dialog) return;
      if (this.requireLogin.prompt() === null) dialog.close();
      else if (!dialog.open) dialog.showModal();
    });
  }
}
