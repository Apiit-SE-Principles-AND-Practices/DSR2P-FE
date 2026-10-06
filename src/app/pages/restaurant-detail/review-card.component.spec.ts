import { TestBed } from '@angular/core/testing';
import type { Review, ReviewComment } from '../../core/restaurant.service';
import { ReviewCardComponent } from './review-card.component';

const comment = (id: number, status: ReviewComment['status'] = 'Approved'): ReviewComment => ({
  id,
  commentText: `Reply ${String(id)}`,
  status,
  createdAt: '2026-10-06T12:00:00Z',
});
const base: Review = {
  id: 1,
  foodQualityRating: 5,
  serviceRating: 4,
  miscRating: 4,
  reviewText: 'Great flavours.\nQuick service.',
  language: 'en',
  createdAt: '2026-10-05T12:00:00Z',
  comments: [],
  response: null,
};

function render(overrides: Partial<Review> = {}) {
  const fixture = TestBed.createComponent(ReviewCardComponent);
  fixture.componentRef.setInput('review', { ...base, ...overrides });
  fixture.detectChanges();
  return { el: fixture.nativeElement as HTMLElement, fixture };
}

describe('ReviewCardComponent', () => {
  it('is an article with a dated heading, the average beside the numerals of each rating', () => {
    const { el } = render();
    expect(el.querySelector('article h3 time')?.textContent).toContain('2026');
    expect(el.querySelector('app-rating-display strong')?.textContent).toBe('4.3');
    expect(el.querySelector('.detail')?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      'Food 5 · Service 4 · Other 4',
    );
  });

  it('shows the text in its own language, as plain text only', () => {
    const { el } = render({
      language: 'si',
      reviewText: '<b>bold</b> <img src=x onerror=alert(1)>',
    });
    const text = el.querySelector('.text');
    expect(text?.getAttribute('lang')).toBe('si');
    expect(text?.textContent).toBe('<b>bold</b> <img src=x onerror=alert(1)>'); // shown literally
    expect(el.querySelector('.text b, .text img')).toBeNull();
  });

  it('never shows a moderation status', () => {
    const text = render({ comments: [comment(1)] }).el.textContent ?? '';
    expect(text).not.toMatch(/pending|approved|rejected/i);
  });

  it('places the restaurant response beneath its review', () => {
    const { el } = render({
      response: { responseText: 'Thank you!', createdAt: '2026-10-06T12:00:00Z' },
    });
    const response = el.querySelector('.response');
    expect(response?.getAttribute('aria-label')).toBe('Response from the restaurant');
    expect(response?.textContent).toContain('Thank you!');
    expect(el.querySelector('.text + .response, article > .response')).not.toBeNull();
  });

  it('has no response block when there is none', () => {
    expect(render().el.querySelector('.response')).toBeNull();
  });

  describe('photos', () => {
    const images = [{ id: 1, imageUrl: 'https://cdn.example.com/a.jpg' }];

    it('shows a lazy thumbnail with descriptive alt text', () => {
      const img = render({ images }).el.querySelector('.thumb img');
      expect(img?.getAttribute('alt')).toBe('Photo attached to this review');
      expect(img?.getAttribute('loading')).toBe('lazy');
    });

    it('opens the larger photo in a dialog', () => {
      const { el, fixture } = render({ images });
      el.querySelector<HTMLButtonElement>('.thumb')?.click();
      fixture.detectChanges();
      const dialog = el.querySelector('dialog');
      expect(dialog?.open).toBeTrue();
      expect(dialog?.querySelector('img')?.getAttribute('src')).toBe(
        'https://cdn.example.com/a.jpg',
      );
    });

    it('is fine when the API sends no images', () => {
      expect(render().el.querySelector('.thumb')).toBeNull();
    });
  });

  describe('replies', () => {
    it('shows the first two approved replies and expands the rest on request', () => {
      const { el, fixture } = render({
        comments: [comment(1), comment(2), comment(3), comment(4)],
      });
      expect(el.querySelectorAll('.replies li').length).toBe(2);
      const more = el.querySelector<HTMLButtonElement>('.replies + button');
      expect(more?.textContent?.trim()).toBe('Show 2 more replies');
      more?.click();
      fixture.detectChanges();
      expect(el.querySelectorAll('.replies li').length).toBe(4);
      expect(el.querySelector('.replies + button')).toBeNull();
    });

    it('leaves out Pending and Rejected replies', () => {
      const { el } = render({
        comments: [comment(1), comment(2, 'Pending'), comment(3, 'Rejected')],
      });
      expect(Array.from(el.querySelectorAll('.replies li p')).map((p) => p.textContent)).toEqual([
        'Reply 1',
      ]);
    });

    it('shows nothing when there are no replies', () => {
      expect(render().el.querySelector('.replies')).toBeNull();
    });
  });
});
