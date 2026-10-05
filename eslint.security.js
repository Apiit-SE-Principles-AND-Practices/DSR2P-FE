// Security-only ESLint rules. Shared by the main config (CI) and the pre-commit hook, so a commit is
// blocked only for security findings while style and type rules are left to CI.
const tseslint = require('typescript-eslint');
const security = require('eslint-plugin-security');
const noUnsanitized = require('eslint-plugin-no-unsanitized');

module.exports = [
  {
    files: ['**/*.ts'],
    languageOptions: { parser: tseslint.parser },
    plugins: { security, 'no-unsanitized': noUnsanitized },
    rules: {
      ...security.configs.recommended.rules,
      ...noUnsanitized.configs.recommended.rules,
      // Fires on every typed `obj[key]`; far too many false positives to be useful.
      'security/detect-object-injection': 'off',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector: 'CallExpression[callee.property.name=/^bypassSecurityTrust/]',
          message: 'Do not bypass Angular sanitisation: user content must render as plain text.',
        },
      ],
    },
  },
];
