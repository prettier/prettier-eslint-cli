declare module '@esm2cjs/indent-string' {
  function indentString(string: string, count?: number): string;

  export default indentString;
}

declare module 'common-tags' {
  interface CommonTag {
    (strings: TemplateStringsArray, ...values: unknown[]): string;
    (string: string): string;
  }

  export const oneLine: CommonTag;
  export const oneLineTrim: CommonTag;
  export const stripIndent: CommonTag;
}

declare module 'loglevel-colored-level-prefix' {
  interface LoggerLevels {
    SILENT: number;
    ERROR: number;
    WARN: number;
    INFO: number;
    DEBUG: number;
    TRACE: number;
  }

  interface Logger {
    levels: LoggerLevels;
    getLevel(): number | string;
    setLevel(level: number | string): void;
    trace(...args: unknown[]): void;
    debug(...args: unknown[]): void;
    info(...args: unknown[]): void;
    warn(...args: unknown[]): void;
    error(...args: unknown[]): void;
  }

  interface GetLogger {
    (options?: { prefix?: string }): Logger;
  }

  const getLogger: GetLogger;
  export = getLogger;
}

declare module 'lodash.memoize' {
  function memoize<T extends (...args: never[]) => unknown>(
    func: T,
    resolver?: (...args: Parameters<T>) => unknown,
  ): T;

  export = memoize;
}

declare module 'spawn-command' {
  import type { ChildProcessWithoutNullStreams } from 'node:child_process';

  function spawn(
    command: string,
    options?: { cwd?: string; env?: NodeJS.ProcessEnv },
  ): ChildProcessWithoutNullStreams;

  export = spawn;
}
