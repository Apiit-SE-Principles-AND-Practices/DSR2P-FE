import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AdminDashboardComponent } from './admin-dashboard.component';

const counts = (pending: number) => ({ total: 10, pending, approved: 5, rejected: 1 });

/** Lets a resource start its request (open requests keep `whenStable` waiting). */
const tick = () => new Promise((done) => setTimeout(done));

async function setup(reviews = 2, comments = 0) {
  TestBed.configureTestingModule({
    providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
  });
  const backend = TestBed.inject(HttpTestingController);
  const fixture = TestBed.createComponent(AdminDashboardComponent);
  const el = fixture.nativeElement as HTMLElement;
  fixture.detectChanges();
  await tick();
  backend
    .expectOne('/admin/dashboard/stats')
    .flush({ restaurants: 12, users: 40, reviews: counts(reviews), comments: counts(comments) });
  await tick();
  fixture.detectChanges();
  return { backend, el, fixture };
}

describe('AdminDashboardComponent', () => {
  it('shows the four figures', async () => {
    const { el } = await setup();
    const values = [...el.querySelectorAll('.value')].map((v) => v.textContent);
    expect(values).toEqual(['2', '0', '12', '40']);
  });

  it('lays the tiles out 2-up under 640px and 4-up from 640px', async () => {
    const { el } = await setup();
    const columns = getComputedStyle(el.querySelector('.grid') ?? el).gridTemplateColumns;
    expect(columns.split(' ').length).toBe(window.innerWidth >= 640 ? 4 : 2);
  });

  it('flags only a pending count above 0, linking to that queue', async () => {
    const { el } = await setup(2, 0);
    const links = [...el.querySelectorAll('.grid a')];
    expect(links.length).toBe(1);
    expect(links[0].getAttribute('href')).toBe('/admin/moderation?type=reviews');
  });

  it('links pending replies to the replies queue', async () => {
    const { el } = await setup(0, 4);
    expect(el.querySelector('.grid a')?.getAttribute('href')).toBe(
      '/admin/moderation?type=comments',
    );
  });

  it('refreshes when the tab regains focus', async () => {
    const { backend, fixture } = await setup();
    window.dispatchEvent(new Event('focus'));
    fixture.detectChanges();
    await tick();
    backend.expectOne('/admin/dashboard/stats');
  });

  it('links to the restaurant list and the moderation queue', async () => {
    const { el } = await setup();
    const hrefs = [...el.querySelectorAll('nav a')].map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(['/admin/restaurants', '/admin/moderation']);
  });
});
