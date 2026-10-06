import * as z from 'zod/mini';
import { nameSchema } from './register.schema';

/** What the profile form can change: the same name rule as registration (the language saves on its own). */
export const profileSchema = z.object({ name: nameSchema });
