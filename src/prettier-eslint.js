const getLogger = require('loglevel-colored-level-prefix');

const logger = getLogger({ prefix: 'prettier-eslint-cli' });

try {
  // if `prettier-eslint` is installed by the user manually
  module.exports = require('prettier-eslint');
} catch (err) /* istanbul ignore next */ {
  logger.info('We detected that no `prettier-eslint` is installed.');
  logger.info('We will use our internal fallback one instead.');
  logger.info(
    'You can install `prettier-eslint` as dependency to skip this message.'
  );

  // it is an internal dependency using `prettier-eslint` as fallback
  module.exports = require('@prettier/eslint');
}
