import { TestBed } from '@angular/core/testing';
import { StarRatingInputComponent } from './star-rating-input.component';

function render(value: number | null = null, error?: string) {
  const fixture = TestBed.createComponent(StarRatingInputComponent);
  fixture.componentRef.setInput('label', 'Service');
  fixture.componentRef.setInput('name', 'service');
  fixture.componentRef.setInput('value', value);
  if (error) fixture.componentRef.setInput('error', error);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  return {
    el,
    fixture,
    radios: () => Array.from(el.querySelectorAll<HTMLInputElement>('input[type=radio]')),
  };
}

describe('StarRatingInputComponent', () => {
  it('is a fieldset with a legend and exactly five radio options sharing one group', () => {
    const { el, radios } = render();
    expect(el.querySelector('fieldset legend')?.textContent?.trim()).toBe('Service (required)');
    expect(radios().map((r) => r.value)).toEqual(['1', '2', '3', '4', '5']);
    expect(new Set(radios().map((r) => r.name))).toEqual(new Set(['service']));
  });

  it('only whole numbers 1 to 5 can be chosen, and choosing updates the value', () => {
    const { fixture, radios } = render();
    radios()[3].click();
    fixture.detectChanges();
    expect(fixture.componentInstance.value()).toBe(4);
    expect(radios()[3].checked).toBeTrue();
  });

  it('names each option in words for screen readers, and fills the stars up to the value', () => {
    const { el } = render(3);
    const words = Array.from(el.querySelectorAll('.star span.sr-only')).map((s) =>
      s.textContent?.trim(),
    );
    expect(words).toEqual(['1 star', '2 stars', '3 stars', '4 stars', '5 stars']);
    expect(
      Array.from(el.querySelectorAll('.star [aria-hidden]'))
        .map((s) => s.textContent)
        .join(''),
    ).toBe('★★★☆☆');
  });

  it('shows an error message when given one', () => {
    expect(
      render(null, 'Choose a rating from 1 to 5.').el.querySelector('.field-error')?.textContent,
    ).toBe('Choose a rating from 1 to 5.');
  });
});
