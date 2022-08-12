const config = {
  extends: ['kentcdodds', 'kentcdodds/jest'],
  rules: {
    quotes: ['error', 'single', { avoidEscape: true }],
    'arrow-parens': ['error', 'as-needed'],
    'import/max-dependencies': 'off',
    'jest/prefer-snapshot-hint': 'off',
    'max-len': 'off',
    'space-before-function-paren': [
      'error',
      {
        anonymous: 'never',
        named: 'never',
        asyncArrow: 'always'
      }
    ]
  }
};

module.exports = config;
