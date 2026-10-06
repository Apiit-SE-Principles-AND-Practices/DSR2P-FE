import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { SessionStore, type Role } from '../../core/session.store';
import { RestaurantHeaderComponent } from './restaurant-header.component';

function render(role?: Role) {
  TestBed.configureTestingModule({
    providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
  });
  if (role) {
    const user = { id: '1', name: 'Ann', email: 'a@b.lk', role, language: 'en' } as const;
    TestBed.inject(SessionStore).start({ token: 't', user });
  }
  const fixture = TestBed.createComponent(RestaurantHeaderComponent);
  fixture.componentRef.setInput('restaurant', {
    id: 'r-1',
    name: 'Sea Spray',
    city: 'Galle',
    address: '1 Fort Rd',
    imageUrl: null,
    categories: [],
    averageRating: null,
    priceBand: null,
  });
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('RestaurantHeaderComponent', () => {
  it('offers an Admin a link to edit the restaurant', () => {
    const link = render('Admin').querySelector('a.secondary');
    expect(link?.textContent).toBe('Edit restaurant');
    expect(link?.getAttribute('href')).toBe('/admin/restaurants/r-1/edit');
  });

  it('shows nobody else an edit link', () => {
    expect(render('Customer').textContent).not.toContain('Edit restaurant');
  });
});
