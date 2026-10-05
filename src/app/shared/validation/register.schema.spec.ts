import { registerSchema } from './register.schema';

const valid = {
  name: 'Nimal Perera',
  email: 'nimal@example.com',
  password: 'Password123',
  confirmPassword: 'Password123',
  language: 'en',
};

/** First message the schema reports for a field, or undefined when that field is fine. */
function errorOn(field: string, overrides: Record<string, string>): string | undefined {
  const result = registerSchema.safeParse({ ...valid, ...overrides });
  return result.error?.issues.find((i) => i.path[0] === field)?.message;
}

describe('registerSchema', () => {
  it('accepts a valid registration', () => {
    expect(registerSchema.safeParse(valid).success).toBeTrue();
  });

  const cases: [field: string, overrides: Record<string, string>, message?: string][] = [
    ['name', { name: '  ' }, 'Enter your name.'],
    ['email', { email: '' }, 'Enter your email address.'],
    ['email', { email: 'not-an-email' }, 'Enter a valid email address.'],
    ['password', { password: '' }, 'Enter a password.'],
    ['password', { password: 'short1' }, 'Password does not meet the rules.'],
    ['password', { password: 'allletters' }, 'Password does not meet the rules.'],
    ['password', { password: '12345678' }, 'Password does not meet the rules.'],
    ['password', { password: 'a1'.repeat(37) }, 'Password does not meet the rules.'], // 74 chars
    ['confirmPassword', { confirmPassword: 'Different123' }, 'Passwords do not match.'],
    ['language', { language: 'fr' }, undefined],
  ];

  cases.forEach(([field, overrides, message]) => {
    it(`rejects ${JSON.stringify(overrides)}`, () => {
      const error = errorOn(field, overrides);
      expect(error).toBeDefined();
      if (message) expect(error).toBe(message);
    });
  });
});
