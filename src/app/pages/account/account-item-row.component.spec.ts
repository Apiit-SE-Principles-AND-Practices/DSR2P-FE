import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AccountItemRowComponent, type AccountItem } from './account-item-row.component';

const item: AccountItem = {
  id: 1,
  label: 'Review of Sea Spray',
  link: ['/restaurants', 'r-9'],
  text: 'Lovely fish.\nFriendly staff.',
  createdAt: '2026-10-05T12:00:00Z',
  status: 'Approved',
  rejectionReason: null,
};

function render(overrides: Partial<AccountItem> = {}) {
  TestBed.configureTestingModule({ providers: [provideRouter([])] });
  const fixture = TestBed.createComponent(AccountItemRowComponent);
  fixture.componentRef.setInput('item', { ...item, ...overrides });
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('AccountItemRowComponent', () => {
  it('shows the label as a link to the restaurant, the date, the badge and the text', () => {
    const el = render();
    expect(el.querySelector('h3 a')?.textContent).toBe('Review of Sea Spray');
    expect(el.querySelector('h3 a')?.getAttribute('href')).toBe('/restaurants/r-9');
    expect(el.querySelector('h3 time')?.textContent).toContain('2026');
    expect(el.querySelector('app-status-badge')?.textContent).toContain('Published');
    expect(el.querySelector('.excerpt')?.textContent).toBe('Lovely fish.\nFriendly staff.');
  });

  it('shows the label as plain text when there is no page to link to', () => {
    const el = render({ label: 'Reply to a review', link: null });
    expect(el.querySelector('h3 a')).toBeNull();
    expect(el.querySelector('h3')?.textContent).toContain('Reply to a review');
  });

  it('shows the moderator’s reason beneath a rejected item', () => {
    const el = render({ status: 'Rejected', rejectionReason: 'Contains personal data' });
    expect(el.querySelector('app-status-badge')?.textContent).toContain('Rejected');
    expect(el.querySelector('.excerpt + .reason')?.textContent).toBe(
      'Reason: Contains personal data',
    );
  });

  ['', null].forEach((missing) => {
    it(`says "No reason recorded" instead of hiding a rejected item whose reason is ${JSON.stringify(missing)}`, () => {
      const el = render({ status: 'Rejected', rejectionReason: missing });
      expect(el.textContent).toContain('Reason: No reason recorded');
      expect(el.querySelector('.excerpt')).not.toBeNull(); // the row is still there
    });
  });

  ['Pending', 'Approved'].forEach((status) => {
    it(`shows no reason line for a ${status} item`, () => {
      expect(
        render({ status: status as AccountItem['status'] }).querySelector('.reason'),
      ).toBeNull();
    });
  });
});
