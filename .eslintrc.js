const config = {
  parser: '@babel/eslint-parser',
  rules: {
    quotes: ['error', 'single', { avoidEscape: true }],
    'arrow-parens': ['error', 'as-needed'],
    'max-len': 'off',
    'import/max-dependencies': 'off',
    'space-before-function-paren': [
      'error',
      {
        anonymous: 'never',
        named: 'never',
        asyncArrow: 'always',
      },
    ],
  },
};

module.exports = config;
