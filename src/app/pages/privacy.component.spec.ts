import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DATA_COLLECTED } from '../core/privacy';
import { PrivacyComponent } from './privacy.component';

describe('PrivacyComponent', () => {
  it('lists what is collected and why, how long it is kept, and links to the data page', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(PrivacyComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    DATA_COLLECTED.forEach(({ label, why }) => {
      expect(el.textContent).toContain(label);
      expect(el.textContent).toContain(why);
    });
    expect(el.textContent).toContain('How long we keep it');
    expect(el.querySelector('a')?.getAttribute('href')).toBe('/account/data');
  });
});
