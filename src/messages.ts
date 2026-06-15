import { MessageFormat } from 'messageformat';

export interface MessageData {
  count: number;
  countString: string;
  failure?: string;
  success?: string;
  unchanged?: string;
}

function formatMessage(message: string, data: MessageData): string {
  return new MessageFormat('en', message, { bidiIsolation: 'none' }).format(
    data as unknown as Record<string, unknown>,
  );
}

export function success(data: MessageData): string {
  return formatMessage(
    `.input {$count :number select=cardinal}
.match $count
one {{{$success} formatting {$countString} file with prettier-eslint}}
* {{{$success} formatting {$countString} files with prettier-eslint}}`,
    data,
  );
}

export function failure(data: MessageData): string {
  return formatMessage(
    `.input {$count :number select=cardinal}
.match $count
one {{{$failure} formatting {$countString} file with prettier-eslint}}
* {{{$failure} formatting {$countString} files with prettier-eslint}}`,
    data,
  );
}

export function unchanged(data: MessageData): string {
  return formatMessage(
    `.input {$count :number select=cardinal}
.match $count
one {{{$countString} file was {$unchanged}}}
* {{{$countString} files were {$unchanged}}}`,
    data,
  );
}
