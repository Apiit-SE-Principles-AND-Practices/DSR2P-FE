import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AdminStatTileComponent } from './admin-stat-tile.component';

function setup(value: number, withAction = true) {
  TestBed.configureTestingModule({ providers: [provideRouter([])] });
  const fixture = TestBed.createComponent(AdminStatTileComponent);
  fixture.componentRef.setInput('label', 'Pending reviews');
  fixture.componentRef.setInput('value', value);
  if (withAction) {
    fixture.componentRef.setInput('action', {
      path: '/admin/moderation',
      query: { type: 'reviews' },
    });
  }
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('AdminStatTileComponent', () => {
  it('shows the label and the number', () => {
    const el = setup(0);
    expect(el.textContent).toContain('Pending reviews');
    expect(el.querySelector('.value')?.textContent).toBe('0');
  });

  it('flags a count above 0 with text, a link to the right queue, and the attention style', () => {
    const el = setup(3);
    expect(el.textContent).toContain('Needs review');
    expect(el.querySelector('.tile')?.classList).toContain('attention');
    expect(el.querySelector('a')?.getAttribute('href')).toBe('/admin/moderation?type=reviews');
    expect(el.querySelector('a')?.textContent).toContain('Review now →');
  });

  it('shows no flag or link at 0', () => {
    const el = setup(0);
    expect(el.textContent).not.toContain('Needs review');
    expect(el.querySelector('a')).toBeNull();
    expect(el.querySelector('.tile')?.classList).not.toContain('attention');
  });

  it('never flags a tile that has no action', () => {
    expect(setup(5, false).textContent).not.toContain('Needs review');
  });
});
