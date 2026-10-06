import type { AbstractControl, ValidatorFn } from '@angular/forms';
import * as z from 'zod/mini';

/** First message per field, keyed by its full path: `name`, or `menuItems.2.priceLkr` for a nested field. */
export function issueMessages(error: {
  issues: readonly { path: readonly PropertyKey[]; message: string }[];
}): Record<string, string> {
  const messages: Record<string, string> = {};
  for (const issue of error.issues) messages[issue.path.map(String).join('.')] ??= issue.message;
  return messages;
}

/** Group-level Angular validator driven by a Zod schema, so forms reuse the shared rules. */
export const zodValidator =
  (schema: z.ZodMiniType): ValidatorFn =>
  (group) => {
    const result = schema.safeParse(group.value);
    return result.success ? null : { zod: issueMessages(result.error) };
  };

/** The schema's message for one field (by path) of a group validated by `zodValidator`. */
export const fieldError = (group: AbstractControl, path: string): string | undefined =>
  (group.errors?.['zod'] as Record<string, string> | undefined)?.[path];

/** The API writes a nested field as `menuItems[2].priceLkr`; forms key it as `menuItems.2.priceLkr`. */
export const fieldPath = (key: string): string => key.replace(/\[(\d+)\]/g, '.$1');
