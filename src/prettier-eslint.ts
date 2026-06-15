import type { Format } from '@prettier/eslint';

import { logger } from './logger.ts';

let formatPromise: Promise<Format> | undefined;

async function loadFormat(): Promise<Format> {
  // @ts-expect-error - We want to catch the error if `prettier-eslint` is not installed, so we can fallback to our internal one.
  // eslint-disable-next-line import-x/no-unresolved
  formatPromise ??= import('prettier-eslint')
    .catch(async () => {
      logger.info('We detected that no `prettier-eslint` is installed.');
      logger.info('We will use our internal fallback one instead.');
      logger.info(
        'You can install `prettier-eslint` as dependency to skip this message.',
      );

      return import('@prettier/eslint');
    })
    .then((module: Format | { default: Format }) =>
      'default' in module ? module.default : module,
    );

  return formatPromise;
}

export const format: Format = async options => (await loadFormat())(options);
