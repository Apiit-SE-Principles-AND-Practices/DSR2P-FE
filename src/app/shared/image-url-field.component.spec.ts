import { TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { ImageUrlFieldComponent } from './image-url-field.component';

function setup(url = '') {
  const control = new FormControl(url, { nonNullable: true });
  const fixture = TestBed.createComponent(ImageUrlFieldComponent);
  fixture.componentRef.setInput('control', control);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const type = (value: string) => {
    control.setValue(value);
    fixture.detectChanges();
  };
  return { control, el, fixture, type };
}

describe('ImageUrlFieldComponent', () => {
  it('previews an https address and nothing else', () => {
    const { el, type } = setup();
    expect(el.querySelector('img')).toBeNull();
    type('http://example.lk/a.png');
    expect(el.querySelector('img')).toBeNull();
    type('https://example.lk/a.png');
    expect(el.querySelector('img')?.getAttribute('src')).toBe('https://example.lk/a.png');
  });

  it('says so, and flags the control, when the address does not open as an image', () => {
    const { control, el, fixture, type } = setup('https://example.lk/missing.png');
    el.querySelector('img')?.dispatchEvent(new Event('error'));
    fixture.detectChanges();

    expect(el.textContent).toContain('That address does not open as an image.');
    expect(control.hasError('unloadable')).toBeTrue();

    type('https://example.lk/other.png');
    expect(el.textContent).not.toContain('does not open');
    expect(control.hasError('unloadable')).toBeFalse();
  });

  it('shows the schema or server message it is given', () => {
    const { el, fixture } = setup();
    fixture.componentRef.setInput('error', 'Enter a full address starting with https://');
    fixture.detectChanges();
    expect(el.textContent).toContain('Enter a full address starting with https://');
  });
});
