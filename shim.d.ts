declare module 'loglevel-colored-level-prefix' {
  import { LogLevelDesc, Logger } from 'loglevel';

  export interface GetLogger {
    (options?: { level?: LogLevelDesc; prefix?: string }): Logger;
  }

  const getLogger: GetLogger;

  export default getLogger;
}

declare module 'spawn-command' {
  import type {
    ChildProcessWithoutNullStreams,
    SpawnOptions,
  } from 'node:child_process';

  function spawn(
    command: string,
    options?: SpawnOptions,
  ): ChildProcessWithoutNullStreams;

  export = spawn;
}
