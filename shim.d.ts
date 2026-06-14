declare module 'loglevel-colored-level-prefix' {
  namespace getLogger {
    type LowerLogLevel =
      | 'debug'
      | 'error'
      | 'info'
      | 'silent'
      | 'trace'
      | 'warn';

    type UpperLogLevel = Uppercase<LowerLogLevel>;

    type LogLevel = LowerLogLevel | UpperLogLevel | number;

    interface Logger extends Record<
      LogLevel,
      (message: string, ...args: unknown[]) => void
    > {
      levels: Record<LogLevel, number>;
      getLevel: () => number;
      setLevel: (level: LogLevel) => void;
    }

    interface GetLogger {
      (options?: { prefix: string }): Logger;
    }
  }

  const getLogger: getLogger.GetLogger;

  export = getLogger;
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
