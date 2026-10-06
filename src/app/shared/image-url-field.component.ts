import { Component, computed, effect, input, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

/**
 * An image given as a web address. It must be https, and the preview doubles as the load check: if the
 * browser cannot open it as an image the field says so and the control gets an `unloadable` error.
 */
@Component({
  selector: 'app-image-url-field',
  imports: [ReactiveFormsModule],
  styleUrl: './photo-picker.component.css',
  template: `
    <div class="field">
      <label for="image-url">Image address (optional)</label>
      <input
        id="image-url"
        type="url"
        inputmode="url"
        [formControl]="control()"
        [attr.aria-invalid]="!!message()"
      />
      @if (message(); as text) {
        <span class="field-error" role="alert">{{ text }}</span>
      }
    </div>
    @if (preview(); as src) {
      <img class="preview" alt="Preview of the image address" [src]="src" (error)="fail()" />
    }
  `,
})
export class ImageUrlFieldComponent {
  readonly control = input.required<FormControl<string>>();
  /** The schema's or the server's message, if any. */
  readonly error = input<string>();

  private readonly broken = signal(false);
  private readonly value = signal('');
  protected readonly preview = computed(() => {
    const url = this.value().trim();
    return url.startsWith('https://') ? url : null;
  });
  protected readonly message = computed(
    () => this.error() ?? (this.broken() ? 'That address does not open as an image.' : ''),
  );

  constructor() {
    effect((onCleanup) => {
      const control = this.control();
      this.value.set(control.value);
      const watch = control.valueChanges.subscribe((text) => {
        this.value.set(text);
      });
      onCleanup(() => {
        watch.unsubscribe();
      });
    });
    effect(() => {
      this.preview(); // a new address gets a fresh check
      this.broken.set(false);
    });
  }

  protected fail(): void {
    this.broken.set(true);
    this.control().setErrors({ unloadable: true });
  }
}
