import type { AbstractControl, ValidatorFn } from '@angular/forms';
import * as z from 'zod/mini';

type FieldErrors = Partial<Record<string, string[]>>;

/** Group-level Angular validator driven by a Zod schema, so forms reuse the shared rules. */
export const zodValidator =
  (schema: z.ZodMiniType): ValidatorFn =>
  (group) => {
    const result = schema.safeParse(group.value);
    return result.success ? null : { zod: z.flattenError(result.error).fieldErrors };
  };

/** First schema message for one field of a group validated by `zodValidator`. */
export const fieldError = (group: AbstractControl, field: string): string | undefined =>
  (group.errors?.['zod'] as FieldErrors | undefined)?.[field]?.[0];
