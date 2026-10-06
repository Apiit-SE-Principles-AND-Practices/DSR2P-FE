import * as z from 'zod/mini';
import { GUIDELINE_CATEGORIES } from '../../core/moderation-guidelines';

export const REJECTION_MAX = 500;

/** Starting points for the reason: the guideline categories, which fill the box and stay editable. */
export const REJECTION_PRESETS: readonly string[] = GUIDELINE_CATEGORIES.map((c) => c.reason);

/** Mirrors the backend reject input (non-blank reason). The upper limit is ours: the backend states none. */
export const rejectionReasonSchema = z
  .string()
  .check(
    z.trim(),
    z.minLength(1, 'Give a reason.'),
    z.maxLength(REJECTION_MAX, `Use ${String(REJECTION_MAX)} characters or fewer.`),
  );
