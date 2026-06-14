import fs from 'node:fs';
import path from 'node:path';
import { text } from 'node:stream/consumers';

import indentString from '@esm2cjs/indent-string';
import chalk from 'chalk-cjs';
import findUp from 'find-up';
import { glob } from 'glob';
import nodeIgnore from 'ignore';
import memoize from 'lodash.memoize';
import getLogger, { type LogLevel } from 'loglevel-colored-level-prefix';
import { bindNodeCallback, from, of, type Observable } from 'rxjs';
import { catchError, concatAll, distinct, map, mergeMap } from 'rxjs/operators';

import * as messages from './messages';
import format from './prettier-eslint';

const INDENT_COUNT = 4;

const LINE_SEPARATOR_REGEX = /\r|\r?\n/;

type PrettierOptions = Record<string, unknown>;

export interface FormatFilesArgv extends PrettierOptions {
  $0?: string;
  _?: string[];
  config?: string;
  eslintConfigPath?: string;
  eslintIgnore?: boolean;
  eslintPath?: string;
  h?: boolean;
  help?: boolean;
  ignore?: string[];
  includeDotFiles?: boolean;
  l?: LogLevel;
  listDifferent?: boolean;
  logLevel?: LogLevel;
  prettierIgnore?: boolean;
  prettierLast?: boolean;
  prettierPath?: string;
  stdin?: boolean;
  stdinFilepath?: string;
  version?: boolean;
  write?: boolean;
}

interface CliOptions {
  includeDotFiles?: boolean;
  listDifferent?: boolean;
  write?: boolean;
}

interface PrettierESLintOptions {
  eslintConfig?: {
    overrideConfigFile: string;
  };
  eslintPath?: string;
  filePath?: string;
  logLevel: LogLevel;
  prettierLast?: boolean;
  prettierOptions: PrettierOptions;
  prettierPath?: string;
}

interface FormatFilesFromGlobsOptions {
  applyEslintIgnore: boolean;
  applyPrettierIgnore: boolean;
  cliOptions: CliOptions;
  fileGlobs: string[];
  ignoreGlobs: string[];
  prettierESLintOptions: PrettierESLintOptions;
}

interface FileInfo {
  error?: unknown;
  filePath: string;
  formatted?: string;
  text?: string;
  unchanged?: boolean;
}

interface FormatFilesResult {
  error?: unknown;
  failures: FileInfo[];
  successes: FileInfo[];
}

const rxReadFile = bindNodeCallback(fs.readFile) as unknown as (
  _filePath: string,
  _encoding: BufferEncoding,
) => Observable<string>;
const rxWriteFile = bindNodeCallback(fs.writeFile) as unknown as (
  _filePath: string,
  _data: string,
) => Observable<void>;
const findUpEslintignoreSyncMemoized = memoize(
  findUpEslintignoreSync,
  findUpMemoizeResolver,
);
const findUpPrettierignoreSyncMemoized = memoize(
  findUpPrettierignoreSync,
  findUpMemoizeResolver,
);

const getIsIgnoredMemoized = memoize(getIsIgnored);

const logger = getLogger({ prefix: 'prettier-eslint-cli' });

export default formatFilesFromArgv;

function formatFilesFromArgv({
  _: fileGlobs = [],
  $0: _$0,
  help: _help,
  h: _help_,
  version: _version,
  logLevel = logger.getLevel(),
  l: _logLevelAlias,
  config: _config,
  listDifferent,
  stdin,
  stdinFilepath,
  write,
  eslintPath,
  prettierPath,
  ignore: ignoreGlobs = [],
  eslintIgnore: applyEslintIgnore = true,
  prettierIgnore: applyPrettierIgnore = true,
  eslintConfigPath,
  prettierLast,
  includeDotFiles,
  ...prettierOptions
}: FormatFilesArgv): Promise<FormatFilesResult | string> {
  logger.setLevel(logLevel);
  const prettierESLintOptions: PrettierESLintOptions = {
    logLevel,
    eslintPath,
    prettierPath,
    prettierLast,
    prettierOptions,
  };

  if (eslintConfigPath) {
    prettierESLintOptions.eslintConfig = {
      overrideConfigFile: eslintConfigPath,
    };
  }

  const cliOptions = { write, listDifferent, includeDotFiles };
  if (stdin) {
    return formatStdin({ filePath: stdinFilepath, ...prettierESLintOptions });
  }
  return formatFilesFromGlobs({
    fileGlobs,
    ignoreGlobs: [...ignoreGlobs], // make a copy to avoid manipulation
    cliOptions,
    prettierESLintOptions,
    applyEslintIgnore,
    applyPrettierIgnore,
  });
}

async function formatStdin(
  prettierESLintOptions: PrettierESLintOptions,
): Promise<string> {
  let stdinValue = '';

  if (!process.stdin.isTTY) {
    const stdin = await text(process.stdin);
    stdinValue = stdin.trim();
  }

  try {
    const formatted = await format({
      text: stdinValue,
      ...prettierESLintOptions,
    });
    process.stdout.write(formatted);
    return formatted;
  } catch (error) {
    logger.error(
      'There was a problem trying to format the stdin text',
      `\n${indentString((error as Error).stack as string, INDENT_COUNT)}`,
    );
    process.exitCode = 1;
    return stdinValue;
  }
}

function formatFilesFromGlobs({
  fileGlobs,
  ignoreGlobs,
  cliOptions,
  prettierESLintOptions,
  applyEslintIgnore,
  applyPrettierIgnore,
}: FormatFilesFromGlobsOptions): Promise<FormatFilesResult> {
  const concurrentGlobs = 3;
  const concurrentFormats = 10;
  return new Promise(resolve => {
    const successes: FileInfo[] = [];
    const failures: FileInfo[] = [];
    const unchanged: FileInfo[] = [];
    from(fileGlobs)
      .pipe(
        mergeMap(
          fileGlob =>
            getFilesFromGlob(
              ignoreGlobs,
              applyEslintIgnore,
              applyPrettierIgnore,
              fileGlob,
              cliOptions,
            ),
          concurrentGlobs,
        ),
        concatAll(),
        distinct(),
        mergeMap(filePathToFormatted, concurrentFormats),
      )
      .subscribe({
        complete: onComplete,
        error: onError,
        next: onNext,
      });

    function filePathToFormatted(filePath: string): Observable<FileInfo> {
      const absoluteFilePath = path.resolve(filePath);
      return formatFile(absoluteFilePath, prettierESLintOptions, cliOptions);
    }

    function onNext(info: FileInfo): void {
      if (info.error) {
        failures.push(info);
      } else if (info.unchanged) {
        unchanged.push(info);
      } else {
        successes.push(info);
      }
    }

    function onError(error: Error): void {
      logger.error(
        'There was an unhandled error while formatting the files',
        `\n${indentString(error.stack as string, INDENT_COUNT)}`,
      );
      process.exitCode = 1;
      resolve({ error, successes, failures });
    }

    function onComplete(): void {
      const isSilent =
        logger.getLevel() === logger.levels.SILENT || cliOptions.listDifferent;

      /* use console.error directly here because
       * - we don't want these messages prefixed
       * - we want them to go to stderr, not stdout
       */
      if (!isSilent) {
        if (successes.length > 0) {
          console.error(
            messages.success({
              success: chalk.green('success'),
              count: successes.length,
              countString: chalk.bold(successes.length),
            }),
          );
        }
        if (failures.length > 0) {
          process.exitCode = 1;
          console.error(
            messages.failure({
              failure: chalk.red('failure'),
              count: failures.length,
              countString: chalk.bold(failures.length),
            }),
          );
        }
        if (unchanged.length > 0) {
          console.error(
            messages.unchanged({
              unchanged: chalk.gray('unchanged'),
              count: unchanged.length,
              countString: chalk.bold(unchanged.length),
            }),
          );
        }
      }
      resolve({ successes, failures });
    }
  });
}

function getFilesFromGlob(
  ignoreGlobs: string[],
  applyEslintIgnore: boolean,
  applyPrettierIgnore: boolean,
  fileGlob: string,
  cliOptions: CliOptions,
): Observable<string[]> {
  const globOptions = { dot: cliOptions.includeDotFiles, ignore: ignoreGlobs };
  if (!fileGlob.includes('node_modules')) {
    // basically, we're going to protect you from doing something
    // not smart unless you explicitly include it in your glob
    globOptions.ignore.push('**/node_modules/**');
  }
  return from(glob(fileGlob, globOptions)).pipe(
    map(filePaths =>
      filePaths.filter(filePath => {
        if (applyEslintIgnore && isFilePathMatchedByEslintignore(filePath)) {
          return false;
        }

        return !(
          applyPrettierIgnore && isFilePathMatchedByPrettierignore(filePath)
        );
      }),
    ),
  );
}

function formatFile(
  filePath: string,
  prettierESLintOptions: PrettierESLintOptions,
  cliOptions: CliOptions,
): Observable<FileInfo> {
  const fileInfo: FileInfo = { filePath };
  let format$ = rxReadFile(filePath, 'utf8').pipe(
    mergeMap(async text => {
      fileInfo.text = text;
      fileInfo.formatted = await format({
        text,
        filePath,
        ...prettierESLintOptions,
      });
      fileInfo.unchanged = fileInfo.text === fileInfo.formatted;
      return fileInfo;
    }),
  );

  if (cliOptions.write) {
    format$ = format$.pipe(
      mergeMap(info => {
        if (info.unchanged) {
          return of(info);
        }
        return rxWriteFile(filePath, info.formatted as string).pipe(
          map(() => info),
        );
      }),
    );
  } else if (cliOptions.listDifferent) {
    format$ = format$.pipe(
      map(info => {
        if (!info.unchanged) {
          process.exitCode = 1;
          console.log(info.filePath);
        }
        return info;
      }),
    );
  } else {
    format$ = format$.pipe(
      map(info => {
        process.stdout.write(info.formatted as string);
        return info;
      }),
    );
  }

  return format$.pipe(
    catchError((error: unknown) => {
      logger.error(
        `There was an error formatting "${fileInfo.filePath}":`,
        `\n${indentString((error as Error).stack as string, INDENT_COUNT)}`,
      );
      return of({ ...fileInfo, error });
    }),
  );
}

function getNearestEslintignorePath(filePath: string): string | undefined {
  const { dir } = path.parse(filePath);
  return findUpEslintignoreSyncMemoized('.eslintignore', dir);
}

function isFilePathMatchedByEslintignore(filePath: string): boolean {
  const eslintignorePath = getNearestEslintignorePath(filePath);
  if (!eslintignorePath) {
    return false;
  }

  const eslintignoreDir = path.parse(eslintignorePath).dir;
  const filePathRelativeToEslintignoreDir = path.relative(
    eslintignoreDir,
    filePath,
  );
  const isIgnored = getIsIgnoredMemoized(eslintignorePath);
  return isIgnored(filePathRelativeToEslintignoreDir);
}

function getNearestPrettierignorePath(filePath: string): string | undefined {
  const { dir } = path.parse(filePath);
  return findUpPrettierignoreSyncMemoized('.prettierignore', dir);
}

function isFilePathMatchedByPrettierignore(filePath: string): boolean {
  const prettierignorePath = getNearestPrettierignorePath(filePath);
  if (!prettierignorePath) {
    return false;
  }

  const prettierignoreDir = path.parse(prettierignorePath).dir;
  const filePathRelativeToPrettierignoreDir = path.relative(
    prettierignoreDir,
    filePath,
  );
  const isIgnored = getIsIgnoredMemoized(prettierignorePath);
  return isIgnored(filePathRelativeToPrettierignoreDir);
}

function findUpMemoizeResolver(...args: string[]): string {
  return args.join('::');
}

function findUpEslintignoreSync(
  _filename: string,
  cwd: string,
): string | undefined {
  return findUp.sync('.eslintignore', { cwd });
}

function findUpPrettierignoreSync(
  _filename: string,
  cwd: string,
): string | undefined {
  return findUp.sync('.prettierignore', { cwd });
}

function getIsIgnored(filename: string): (_filePath: string) => boolean {
  const ignoreLines = fs
    .readFileSync(filename, 'utf8')
    .split(LINE_SEPARATOR_REGEX)
    .filter(line => Boolean(line.trim()));
  const instance = nodeIgnore();
  instance.add(ignoreLines);
  return instance.ignores.bind(instance);
}
