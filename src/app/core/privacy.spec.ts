import { TestBed } from '@angular/core/testing';
import { RegisterComponent } from '../pages/register/register.component';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { clearLocalData, DATA_COLLECTED, downloadJson } from './privacy';

describe('clearLocalData', () => {
  it('removes everything kept in the browser', () => {
    localStorage.setItem('city', 'Kandy');
    sessionStorage.setItem('review-draft:1', '{}');
    clearLocalData();
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });
});

describe('downloadJson', () => {
  it('offers the data as a named, pretty-printed JSON file', async () => {
    let saved: Blob | undefined;
    spyOn(URL, 'createObjectURL').and.callFake((blob) => {
      saved = blob as Blob;
      return 'blob:x';
    });
    spyOn(URL, 'revokeObjectURL');
    let name = '';
    spyOn(HTMLAnchorElement.prototype, 'click').and.callFake(function (this: HTMLAnchorElement) {
      name = this.download;
    });

    downloadJson('my-data.json', { a: 1 });

    expect(name).toBe('my-data.json');
    expect(saved?.type).toBe('application/json');
    expect(await saved?.text()).toBe('{\n  "a": 1\n}');
  });
});

describe('DATA_COLLECTED', () => {
  it('has a reason for every field of the registration form, and no field the form lacks', () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    const fixture = TestBed.createComponent(RegisterComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const ids = [...el.querySelectorAll('input:not([type=radio]):not([type=checkbox])')].map(
      (input) => input.id,
    );
    // "Confirm password" only repeats the password to catch typos: it is never stored or sent.
    const collected = [...ids.filter((id) => id !== 'confirmPassword'), 'language'];

    expect(collected.sort()).toEqual(DATA_COLLECTED.map((item) => item.key).sort());
    DATA_COLLECTED.forEach((item) => {
      expect(item.why.length).toBeGreaterThan(0);
    });
  });
});
