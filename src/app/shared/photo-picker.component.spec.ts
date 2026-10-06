import { TestBed } from '@angular/core/testing';
import { MAX_PHOTO_BYTES } from '../core/image';
import { PhotoPickerComponent } from './photo-picker.component';

async function realPicture(width = 800, height = 600): Promise<File> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d')?.fillRect(0, 0, width, height);
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/png');
  });
  return new File([blob ?? new Blob()], 'me.png', { type: 'image/png' });
}

function setup() {
  const fixture = TestBed.createComponent(PhotoPickerComponent);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const input = el.querySelector<HTMLInputElement>('input[type=file]');
  if (!input) throw new Error('No file input');
  /** Picks a file the way the browser does, then waits for processing to finish. */
  const pick = async (chosen: File) => {
    const transfer = new DataTransfer();
    transfer.items.add(chosen);
    input.files = transfer.files;
    input.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve, 150)); // image decoding is not tracked by Angular
    fixture.detectChanges();
  };
  return { el, fixture, input, pick, picker: fixture.componentInstance };
}

describe('PhotoPickerComponent', () => {
  it('accepts only the three image types in the file chooser', () => {
    expect(setup().input.accept).toBe('image/jpeg,image/png,image/webp');
  });

  it('BB11 — a valid photo is shrunk, previewed, and needs the rights confirmation', async () => {
    const { el, pick, picker } = setup();
    await pick(await realPicture());
    expect(picker.photo()?.type).toBe('image/jpeg');
    expect(el.querySelector('img.preview')?.getAttribute('alt')).toBe('Preview of your photo');
    expect(el.querySelector<HTMLInputElement>('input[type=checkbox]')?.checked).toBeFalse();
    expect(el.textContent).toContain('This is my photo, or I have permission to share it.');
  });

  it('ticking the checkbox confirms the rights', async () => {
    const { el, fixture, pick, picker } = setup();
    await pick(await realPicture());
    el.querySelector<HTMLInputElement>('input[type=checkbox]')?.click();
    fixture.detectChanges();
    expect(picker.rights()).toBeTrue();
  });

  it('rejects the wrong file type with a message, and chooses nothing', async () => {
    const { el, pick, picker } = setup();
    await pick(new File(['hello'], 'notes.txt', { type: 'text/plain' }));
    expect(el.querySelector('[role=alert]')?.textContent).toBe('Choose a JPEG, PNG or WebP image.');
    expect(picker.photo()).toBeNull();
    expect(el.querySelector('img.preview')).toBeNull();
  });

  it('rejects a file over 10 MB before processing it', async () => {
    const { el, pick, picker } = setup();
    await pick(
      new File([new ArrayBuffer(MAX_PHOTO_BYTES + 1)], 'huge.jpg', { type: 'image/jpeg' }),
    );
    expect(el.querySelector('[role=alert]')?.textContent).toContain('10 MB');
    expect(picker.photo()).toBeNull();
  });

  it('says so when the file is not a readable image', async () => {
    const { el, pick, picker } = setup();
    await pick(new File(['not really a picture'], 'fake.jpg', { type: 'image/jpeg' }));
    expect(el.querySelector('[role=alert]')?.textContent).toContain('could not be read');
    expect(picker.photo()).toBeNull();
  });

  it('Remove clears the photo, the preview and the confirmation', async () => {
    const { el, fixture, pick, picker } = setup();
    await pick(await realPicture());
    picker.rights.set(true);
    fixture.detectChanges();
    el.querySelector<HTMLButtonElement>('button')?.click();
    fixture.detectChanges();
    expect(picker.photo()).toBeNull();
    expect(picker.rights()).toBeFalse();
    expect(el.querySelector('img.preview')).toBeNull();
  });

  it('a new photo needs its own confirmation', async () => {
    const { pick, picker } = setup();
    await pick(await realPicture());
    picker.rights.set(true);
    await pick(await realPicture(300, 200));
    expect(picker.rights()).toBeFalse();
  });
});
