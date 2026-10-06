import * as z from 'zod/mini';

export const REJECTION_MAX = 500;

/** Starting points from the moderation guidelines; they fill the box and stay editable. */
export const REJECTION_PRESETS = [
  'Personal attack',
  'Not about food or service',
  'Contains personal data',
  'Spam',
] as const;

/** Mirrors the backend reject input (non-blank reason). The upper limit is ours: the backend states none. */
export const rejectionReasonSchema = z
  .string()
  .check(
    z.trim(),
    z.minLength(1, 'Give a reason.'),
    z.maxLength(REJECTION_MAX, `Use ${String(REJECTION_MAX)} characters or fewer.`),
  );
