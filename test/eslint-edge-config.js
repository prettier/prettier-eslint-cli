export default [
  {
    ignores: ['magic-ignored/**'],
  },
  {
    ignores: ['!magic-ignored/keep'],
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
