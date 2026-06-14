import MessageFormat from '@messageformat/core';

interface MessageData {
  [key: string]: unknown;
  count: number;
  countString: string;
  failure?: string;
  success?: string;
  unchanged?: string;
}

const mf =
  new (MessageFormat as unknown as typeof import('@messageformat/core/lib/messageformat.js').default)(
    'en',
  );

export function success(data: MessageData): string {
  const files = '{count, plural, one{file} other{files}}';
  return mf.compile(
    `{success} formatting {countString} ${files} with prettier-eslint`,
  )(data);
}

export function failure(data: MessageData): string {
  const files = '{count, plural, one{file} other{files}}';
  return mf.compile(
    `{failure} formatting {countString} ${files} with prettier-eslint`,
  )(data);
}

export function unchanged(data: MessageData): string {
  const files = '{count, plural, one{file was} other{files were}}';
  return mf.compile(`{countString} ${files} {unchanged}`)(data);
}
