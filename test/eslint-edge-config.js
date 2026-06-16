export default [
  {
    ignores: ['magic-ignored/**/*', '!magic-ignored/keep.js'],
  },
  {
    basePath: 'subdir',
    ignores: ['scoped-ignore'],
  },
  {
    files: ['**/*.js'],
    ignores: ['not-a-global-ignore'],
  },
];
