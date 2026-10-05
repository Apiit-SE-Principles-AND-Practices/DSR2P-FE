import { postLoginPath, safeReturnTo } from './return-to';

describe('safeReturnTo', () => {
  it('keeps same-origin relative paths', () => {
    expect(safeReturnTo('/restaurants/1?tab=menu')).toBe('/restaurants/1?tab=menu');
  });

  ['https://evil.com', '//evil.com', '/\\evil.com', '/\t/evil.com', 'evil', '', null].forEach(
    (url) => {
      it(`rejects ${JSON.stringify(url)}`, () => {
        expect(safeReturnTo(url)).toBeNull();
      });
    },
  );
});

describe('postLoginPath', () => {
  it('sends a Customer to returnTo, or home without one', () => {
    expect(postLoginPath('Customer', '/restaurants/1')).toBe('/restaurants/1');
    expect(postLoginPath('Customer', null)).toBe('/');
  });

  it('sends an Admin to returnTo only when it is an /admin path', () => {
    expect(postLoginPath('Admin', '/admin/moderation')).toBe('/admin/moderation');
    expect(postLoginPath('Admin', '/restaurants/1')).toBe('/admin');
    expect(postLoginPath('Admin', '/administrators')).toBe('/admin');
    expect(postLoginPath('Admin', null)).toBe('/admin');
  });

  it('ignores an unsafe returnTo for both roles', () => {
    expect(postLoginPath('Customer', '//evil.com')).toBe('/');
    expect(postLoginPath('Admin', 'https://evil.com/admin')).toBe('/admin');
  });
});
