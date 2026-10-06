import { TestBed } from '@angular/core/testing';
import type { ModerationStatus } from '../core/account.service';
import { StatusBadgeComponent } from './status-badge.component';

function render(status: ModerationStatus) {
  const fixture = TestBed.createComponent(StatusBadgeComponent);
  fixture.componentRef.setInput('status', status);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('StatusBadgeComponent', () => {
  const cases: [ModerationStatus, string, string][] = [
    ['Pending', '⏳', 'Pending review'],
    ['Approved', '✓', 'Published'],
    ['Rejected', '✕', 'Rejected'],
  ];

  cases.forEach(([status, icon, text]) => {
    it(`${status} shows the icon ${icon} and the words "${text}"`, () => {
      const el = render(status);
      expect(el.querySelector('[aria-hidden=true]')?.textContent).toBe(icon);
      expect(el.textContent?.replace(/\s+/g, ' ').trim()).toBe(`${icon} ${text}`);
      expect(el.querySelector('.badge')?.classList.contains(status.toLowerCase())).toBeTrue();
    });
  });

  it('never relies on colour alone: every status has its own wording', () => {
    const words = cases.map(([status]) =>
      render(status)
        .textContent?.replace(/[^A-Za-z ]/g, '')
        .trim(),
    );
    expect(new Set(words).size).toBe(3);
  });
});
