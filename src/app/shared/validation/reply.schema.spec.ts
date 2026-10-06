import { REPLY_MAX, replySchema } from './reply.schema';

const check = (commentText: unknown) => replySchema.safeParse({ commentText });

describe('replySchema', () => {
  it('accepts a normal reply and trims it', () => {
    expect(replySchema.parse({ commentText: '  Thanks!  ' }).commentText).toBe('Thanks!');
  });

  ['', '   ', '\n\t '].forEach((text) => {
    it(`rejects blank text ${JSON.stringify(text)}`, () => {
      const result = check(text);
      expect(result.success).toBeFalse();
      expect(result.error?.issues[0].message).toBe('Write your reply.');
    });
  });

  it('rejects text that is missing or not a string', () => {
    expect(check(undefined).success).toBeFalse();
    expect(check(5).success).toBeFalse();
  });

  it('allows exactly the maximum and rejects one more', () => {
    expect(check('a'.repeat(REPLY_MAX)).success).toBeTrue();
    expect(check('a'.repeat(REPLY_MAX + 1)).success).toBeFalse();
  });
});
