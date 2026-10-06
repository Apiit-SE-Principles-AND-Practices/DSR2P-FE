/**
 * The reasons a post can be rejected, with what each one means. One list feeds both the guidelines page and
 * the preset reasons in the reject dialog, so the two always agree.
 */
export const GUIDELINE_CATEGORIES = [
  {
    reason: 'Personal attack',
    meaning: 'Insults, harassment or hate speech aimed at a person or a group.',
  },
  {
    reason: 'Not about food or service',
    meaning: 'The post is not about the food or service of the restaurant.',
  },
  {
    reason: 'Contains personal data',
    meaning: 'Phone numbers, home addresses, or photos of people who did not agree.',
  },
  { reason: 'Spam', meaning: 'Adverts, links to other sites, or repeated posts.' },
] as const;
