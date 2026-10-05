import { Component, effect, ElementRef, input, viewChild } from '@angular/core';

/** Form-level error: announced to screen readers and focused whenever a message appears. */
@Component({
  selector: 'app-form-error',
  template: `
    <div #box class="form-error" [class.visible]="message()" role="alert" tabindex="-1">
      {{ message() }}
    </div>
  `,
})
export class FormErrorComponent {
  readonly message = input('');
  private readonly box = viewChild<ElementRef<HTMLElement>>('box');

  constructor() {
    effect(() => {
      if (this.message()) this.box()?.nativeElement.focus();
    });
  }
}
