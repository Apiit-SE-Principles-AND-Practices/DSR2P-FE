import { TestBed } from '@angular/core/testing';
import { CONTRAST_PAIRS } from '../core/contrast';
import { DevTokensComponent } from './dev-tokens.component';

describe('DevTokensComponent', () => {
  it('lists every contrast pair and the EN/SI/TA samples', () => {
    const fixture = TestBed.createComponent(DevTokensComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelectorAll('tbody tr').length).toBe(CONTRAST_PAIRS.length);
    expect(Array.from(el.querySelectorAll('[lang]')).map((p) => p.getAttribute('lang'))).toEqual([
      'en',
      'si',
      'ta',
    ]);
  });
});
