// @ts-check

import base from '@1stg/eslint-config';
import nodeDependencies from 'eslint-plugin-node-dependencies';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  ...base,
  ...nodeDependencies.configs['flat/recommended'],
  {
    ignores: [
      'coverage',
      'dist',
      'test/fixtures',
      '!test/fixtures/paths/node_modules/**/*.js',
    ],
  },
  {
    rules: {
      'prettier/prettier': 'off',
      'valid-jsdoc': 'off',
      'max-len': 'off',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'space-before-function-paren': [
        'error',
        {
          anonymous: 'never',
          named: 'never',
          asyncArrow: 'always',
        },
      ],
      'import/no-import-module-exports': 'off',
      'arrow-parens': ['error', 'as-needed'],
      'sonarjs/fixme-tag': 'warn',
      'sonarjs/function-return-type': 'off',
      'sonarjs/todo-tag': 'warn',
      quotes: ['error', 'single', { avoidEscape: true }],
    },
  },
  {
    files: ['__mocks__/**/*.ts', '**/*.spec.ts'],
    languageOptions: {
      globals: globals.jest,
    },
    rules: {
      '@typescript-eslint/no-magic-numbers': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/prefer-promise-reject-errors': 'off',
      '@typescript-eslint/require-await': 'off',
      'no-magic-numbers': 'off',
      'sonarjs/slow-regex': 'off',
      'unicorn-x/no-useless-undefined': 'off',
      '@typescript-eslint/unbound-method': 'off',
    },
  },
  {
    files: ['**/*.d.ts'],
    rules: {
      '@typescript-eslint/prefer-function-type': 'off',
      'no-unused-vars': 'off',
    },
  },
  {
    files: ['src/index.ts'],
    rules: {
      'n/hashbang': 'off',
    },
  },
);
