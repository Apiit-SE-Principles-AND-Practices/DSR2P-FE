import * as z from 'zod/mini';

export const REPLY_MAX = 1000;

/** Mirrors the backend `CreateCommentInput` (non-blank text). The upper limit is ours: the backend has none. */
export const replySchema = z.object({
  commentText: z
    .string()
    .check(
      z.trim(),
      z.minLength(1, 'Write your reply.'),
      z.maxLength(REPLY_MAX, `Use ${String(REPLY_MAX)} characters or fewer.`),
    ),
});
