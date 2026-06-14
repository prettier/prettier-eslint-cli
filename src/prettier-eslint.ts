import { createRequire } from 'node:module';

import type { Format } from '@prettier/eslint';
import getLogger from 'loglevel-colored-level-prefix';

const logger = getLogger({ prefix: 'prettier-eslint-cli' });
const require = createRequire(import.meta.url);

let format: Format;

try {
  // if `prettier-eslint` is installed by the user manually
  format = require('prettier-eslint') as Format;
} catch /* istanbul ignore next */ {
  logger.info('We detected that no `prettier-eslint` is installed.');
  logger.info('We will use our internal fallback one instead.');
  logger.info(
    'You can install `prettier-eslint` as dependency to skip this message.',
  );

  // it is an internal dependency using `prettier-eslint` as fallback
  format = require('@prettier/eslint') as Format;
}

export default format;
