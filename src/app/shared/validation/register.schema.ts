import * as z from 'zod/mini';

/** Single source of truth for password rules: the live hints and the schema both read this. */
export const PASSWORD_RULES = [
  { label: '8 to 72 characters', test: (p: string) => p.length >= 8 && p.length <= 72 },
  { label: 'At least one letter', test: (p: string) => /[a-z]/i.test(p) },
  { label: 'At least one number', test: (p: string) => /\d/.test(p) },
];

/**
 * Mirrors the backend `RegisterInput` limits (name 1–100, email ≤150) plus the confirm field.
 * Uses zod/mini (tree-shakable) to keep the bundle small.
 */
export const registerSchema = z
  .object({
    name: z
      .string()
      .check(
        z.trim(),
        z.minLength(1, 'Enter your name.'),
        z.maxLength(100, 'Use 100 characters or fewer.'),
      ),
    email: z.pipe(
      z
        .string()
        .check(
          z.trim(),
          z.minLength(1, 'Enter your email address.'),
          z.maxLength(150, 'Use 150 characters or fewer.'),
        ),
      z.email('Enter a valid email address.'),
    ),
    password: z.string().check(
      z.minLength(1, 'Enter a password.'),
      z.refine(
        (p) => PASSWORD_RULES.every((rule) => rule.test(p)),
        'Password does not meet the rules.',
      ),
    ),
    confirmPassword: z.string(),
    language: z.enum(['en', 'si', 'ta']),
  })
  .check(
    z.refine((v) => v.password === v.confirmPassword, {
      path: ['confirmPassword'],
      error: 'Passwords do not match.',
    }),
  );
