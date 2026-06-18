export default [
  {
    ignores: ['eslint-config-ignored', 'nested/eslint-config-ignored'],
  },
  {
    files: ['**/*.js'],
    ignores: ['not-a-global-ignore'],
  },
];
