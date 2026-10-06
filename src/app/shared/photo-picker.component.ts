import { Component, effect, model, signal } from '@angular/core';
import { compressImage, IMAGE_TYPES, validateImage } from '../core/image';

/**
 * An optional photo for a review. The file is checked first, then shrunk in the browser. Once a photo
 * is chosen the user must confirm they may share it (the form will not submit without that).
 */
@Component({
  selector: 'app-photo-picker',
  styleUrl: './photo-picker.component.css',
  template: `
    <div class="field">
      <label for="photo">Add a photo (optional)</label>
      <input id="photo" type="file" [accept]="accept" #input (change)="choose(input)" />
      @if (busy()) {
        <span class="hint" role="status">Preparing your photo…</span>
      }
      @if (error()) {
        <span class="field-error" role="alert">{{ error() }}</span>
      }
    </div>
    @if (preview(); as url) {
      <img class="preview" alt="Preview of your photo" [src]="url" />
      <label class="choice">
        <input type="checkbox" [checked]="rights()" (change)="rights.set(!rights())" />
        This is my photo, or I have permission to share it.
      </label>
      <button type="button" class="btn secondary" (click)="remove(input)">Remove photo</button>
    }
  `,
})
export class PhotoPickerComponent {
  /** The processed photo, ready to upload; null when none is chosen. */
  readonly photo = model<File | null>(null);
  /** Whether the user confirmed the photo is theirs to share. */
  readonly rights = model(false);

  protected readonly accept = IMAGE_TYPES.join(',');
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly preview = signal<string | null>(null);

  constructor() {
    effect((onCleanup) => {
      const file = this.photo();
      if (!file) {
        this.preview.set(null);
        return;
      }
      const url = URL.createObjectURL(file);
      this.preview.set(url);
      onCleanup(() => {
        URL.revokeObjectURL(url);
      });
    });
  }

  protected choose(input: HTMLInputElement): void {
    const file = input.files?.[0];
    if (!file) return;
    const problem = validateImage(file);
    if (problem) {
      this.error.set(problem);
      this.clear(input);
      return;
    }
    void this.prepare(file, input);
  }

  protected remove(input: HTMLInputElement): void {
    this.error.set('');
    this.clear(input);
  }

  private async prepare(file: File, input: HTMLInputElement): Promise<void> {
    this.busy.set(true);
    this.error.set('');
    try {
      this.photo.set(await compressImage(file));
      this.rights.set(false); // a new photo needs its own confirmation
    } catch {
      this.error.set('That image could not be read. Try another one.');
      this.clear(input);
    } finally {
      this.busy.set(false);
    }
  }

  private clear(input: HTMLInputElement): void {
    input.value = '';
    this.photo.set(null);
    this.rights.set(false);
  }
}
