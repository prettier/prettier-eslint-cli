import { createRequire } from 'node:module';

import getLogger from 'loglevel-colored-level-prefix';

interface FormatOptions {
  [key: string]: unknown;
  filePath?: string;
  text: string;
}

type Format = (_options: FormatOptions) => Promise<string> | string;

const requireFromHere = createRequire(__filename);
const logger = getLogger({ prefix: 'prettier-eslint-cli' });

let format: Format;

try {
  // if `prettier-eslint` is installed by the user manually
  format = requireFromHere('prettier-eslint') as Format;
} catch /* istanbul ignore next */ {
  logger.info('We detected that no `prettier-eslint` is installed.');
  logger.info('We will use our internal fallback one instead.');
  logger.info(
    'You can install `prettier-eslint` as dependency to skip this message.',
  );

  // it is an internal dependency using `prettier-eslint` as fallback
  format = requireFromHere('@prettier/eslint') as Format;
}

export = format;
