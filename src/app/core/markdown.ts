/** A heading, paragraph or bullet list. `items` is empty except for lists. */
export interface Block {
  tag: 'h1' | 'h2' | 'h3' | 'p' | 'ul';
  text: string;
  items: string[];
}

/**
 * Just enough Markdown for the guidelines: `#`/`##`/`###` headings, `- ` bullet lists and paragraphs, each
 * separated by a blank line. The result is plain text for the template to place, so no HTML is ever injected.
 */
export function parseMarkdown(source: string): Block[] {
  return source
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk !== '')
    .map((chunk): Block => {
      const lines = chunk.split('\n');
      const heading = /^(#{1,3}) (.+)$/.exec(chunk);
      if (heading) {
        return {
          tag: `h${String(heading[1].length)}` as Block['tag'],
          text: heading[2],
          items: [],
        };
      }
      if (lines.every((line) => line.startsWith('- '))) {
        return { tag: 'ul', text: '', items: lines.map((line) => line.slice(2)) };
      }
      return { tag: 'p', text: lines.join(' '), items: [] };
    });
}
