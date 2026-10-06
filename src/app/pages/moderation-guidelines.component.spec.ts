import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { GUIDELINE_CATEGORIES } from '../core/moderation-guidelines';
import { ModerationGuidelinesComponent } from './moderation-guidelines.component';

/** Lets a resource start its request (open requests keep `whenStable` waiting). */
const tick = () => new Promise((done) => setTimeout(done));

async function setup() {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  const backend = TestBed.inject(HttpTestingController);
  const fixture = TestBed.createComponent(ModerationGuidelinesComponent);
  fixture.detectChanges();
  await tick();
  const request = backend.expectOne((r) => r.url.endsWith('/content/moderation-guidelines.md'));
  return { backend, el: fixture.nativeElement as HTMLElement, fixture, request };
}

describe('ModerationGuidelinesComponent', () => {
  it('renders the bundled Markdown, then every rejection reason', async () => {
    const { el, fixture, request } = await setup();
    expect(request.request.responseType).toBe('text');
    request.flush('# House rules\n\nBe fair.\n\n## Allowed\n\n- Honest criticism\n');
    await tick();
    fixture.detectChanges();

    expect(el.querySelector('h1')?.textContent).toBe('House rules');
    expect(el.querySelector('p')?.textContent).toBe('Be fair.');
    expect(el.querySelector('li')?.textContent).toBe('Honest criticism');
    GUIDELINE_CATEGORIES.forEach(({ reason }) => {
      expect(el.textContent).toContain(reason);
    });
  });

  it('offers a retry when the file cannot be loaded', async () => {
    const { el, fixture, request } = await setup();
    request.flush('Not found', { status: 404, statusText: 'Not Found' });
    await tick();
    fixture.detectChanges();
    expect(el.textContent).toContain('Could not load the guidelines.');
  });
});
