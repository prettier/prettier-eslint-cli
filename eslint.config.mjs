// @ts-check

import base from '@1stg/eslint-config';
import nodeDependencies from 'eslint-plugin-node-dependencies';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  ...base,
  ...nodeDependencies.configs['flat/recommended'],
  {
    ignores: ['test/fixtures', '!test/fixtures/paths/node_modules/**/*.js'],
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
    files: ['__mocks__/**/*.js', '**/*.spec.js'],
    languageOptions: {
      globals: globals.jest,
    },
    rules: {
      'no-magic-numbers': 'off',
      'sonarjs/slow-regex': 'off',
    },
  },
  {
    files: ['src/index.js'],
    rules: {
      'n/hashbang': 'off',
    },
  },
);
