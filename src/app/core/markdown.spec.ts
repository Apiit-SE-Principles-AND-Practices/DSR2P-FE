import { parseMarkdown } from './markdown';

describe('parseMarkdown', () => {
  it('reads headings, paragraphs and bullet lists', () => {
    const blocks = parseMarkdown('# Title\n\nSome text\nmore text.\n\n## Rules\n\n- One\n- Two\n');
    expect(blocks).toEqual([
      { tag: 'h1', text: 'Title', items: [] },
      { tag: 'p', text: 'Some text more text.', items: [] },
      { tag: 'h2', text: 'Rules', items: [] },
      { tag: 'ul', text: '', items: ['One', 'Two'] },
    ]);
  });

  it('returns nothing for empty text', () => {
    expect(parseMarkdown('\n\n')).toEqual([]);
  });

  it('keeps markup as plain text', () => {
    expect(parseMarkdown('<script>alert(1)</script>')[0].text).toBe('<script>alert(1)</script>');
  });
});
