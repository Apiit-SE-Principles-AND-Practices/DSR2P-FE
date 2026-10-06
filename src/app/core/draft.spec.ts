import { readDraft, writeDraft } from './draft';

describe('drafts', () => {
  afterEach(() => {
    sessionStorage.removeItem('draft-test');
  });

  it('saves and reads back text', () => {
    writeDraft('draft-test', 'hello');
    expect(readDraft('draft-test')).toBe('hello');
  });

  it('removes the draft when it is emptied or cleared', () => {
    writeDraft('draft-test', 'hello');
    writeDraft('draft-test', '');
    expect(readDraft('draft-test')).toBeNull();
    writeDraft('draft-test', 'again');
    writeDraft('draft-test', null);
    expect(readDraft('draft-test')).toBeNull();
  });

  it('never throws when storage is blocked', () => {
    spyOn(Storage.prototype, 'getItem').and.throwError('blocked');
    spyOn(Storage.prototype, 'setItem').and.throwError('blocked');
    expect(readDraft('draft-test')).toBeNull();
    expect(() => {
      writeDraft('draft-test', 'x');
    }).not.toThrow();
  });
});
