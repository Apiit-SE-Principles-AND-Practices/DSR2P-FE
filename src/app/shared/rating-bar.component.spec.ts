import { TestBed } from '@angular/core/testing';
import { RatingBarComponent } from './rating-bar.component';

describe('RatingBarComponent', () => {
  it('shows the numeral beside a bar filled in proportion, with a spoken label', () => {
    const fixture = TestBed.createComponent(RatingBarComponent);
    fixture.componentRef.setInput('label', 'Service');
    fixture.componentRef.setInput('value', 4.2);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('strong')?.textContent).toBe('4.2');
    const meter = el.querySelector('[role=meter]');
    expect(meter?.getAttribute('aria-label')).toBe('Service: 4.2 out of 5');
    expect(meter?.getAttribute('aria-valuenow')).toBe('4.2');
    expect(el.querySelector<HTMLElement>('.fill')?.style.width).toBe('84%');
  });
});
