export interface MessageData {
  count: number;
  countString: string;
  failure?: string;
  success?: string;
  unchanged?: string;
}

export function success({ count, countString, success }: MessageData): string {
  return `${success} formatting ${countString} ${pluralize(count, 'file', 'files')} with prettier-eslint`;
}

export function failure({ count, countString, failure }: MessageData): string {
  return `${failure} formatting ${countString} ${pluralize(count, 'file', 'files')} with prettier-eslint`;
}

export function unchanged({
  count,
  countString,
  unchanged,
}: MessageData): string {
  return `${countString} ${pluralize(count, 'file was', 'files were')} ${unchanged}`;
}

function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}
