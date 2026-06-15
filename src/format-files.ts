import fs from 'node:fs/promises';
import path from 'node:path';
import { text } from 'node:stream/consumers';

import type { FormatOptions } from '@prettier/eslint';
import chalk from 'chalk';
import { findUpSync } from 'find-up';
import { glob } from 'glob';
import nodeIgnore from 'ignore';
import indentString from 'indent-string';
import type { LogLevelDesc } from 'loglevel';
import getLogger from 'loglevel-colored-level-prefix';
import type { Options as PrettierOptions } from 'prettier';

import * as messages from './messages.ts';
import format from './prettier-eslint.ts';

const INDENT_COUNT = 4;

const LINE_SEPARATOR_REGEX = /\r|\r?\n/;

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
  l?: LogLevelDesc;
  listDifferent?: boolean;
  logLevel?: LogLevelDesc;
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

interface FormatFilesFromGlobsOptions {
  applyEslintIgnore: boolean;
  applyPrettierIgnore: boolean;
  cliOptions: CliOptions;
  fileGlobs: string[];
  ignoreGlobs: string[];
  prettierESLintOptions: FormatOptions;
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

const eslintignorePathCache = new Map<string, string | undefined>();
const prettierignorePathCache = new Map<string, string | undefined>();
const isIgnoredCache = new Map<
  string,
  Promise<(_filePath: string) => boolean>
>();

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
  const prettierESLintOptions: FormatOptions = {
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
  prettierESLintOptions: FormatOptions,
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
      `\n${indentString((error as Error).stack!, INDENT_COUNT)}`,
    );
    process.exitCode = 1;
    return stdinValue;
  }
}

async function formatFilesFromGlobs({
  fileGlobs,
  ignoreGlobs,
  cliOptions,
  prettierESLintOptions,
  applyEslintIgnore,
  applyPrettierIgnore,
}: FormatFilesFromGlobsOptions): Promise<FormatFilesResult> {
  const concurrentGlobs = 3;
  const concurrentFormats = 10;
  const successes: FileInfo[] = [];
  const failures: FileInfo[] = [];
  const unchanged: FileInfo[] = [];

  try {
    const filePathGroups = await mapLimit(
      fileGlobs,
      concurrentGlobs,
      fileGlob =>
        getFilesFromGlob(
          ignoreGlobs,
          applyEslintIgnore,
          applyPrettierIgnore,
          fileGlob,
          cliOptions,
        ),
    );
    const filePaths = [...new Set(filePathGroups.flat())];
    const formattedFiles = await mapLimit(
      filePaths,
      concurrentFormats,
      filePath =>
        formatFile(path.resolve(filePath), prettierESLintOptions, cliOptions),
    );

    for (const info of formattedFiles) {
      if (info.error) {
        failures.push(info);
      } else if (info.unchanged) {
        unchanged.push(info);
      } else {
        successes.push(info);
      }
    }
  } catch (error) {
    logger.error(
      'There was an unhandled error while formatting the files',
      `\n${indentString((error as Error).stack!, INDENT_COUNT)}`,
    );
    process.exitCode = 1;
    return { error, successes, failures };
  }

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

  return { successes, failures };
}

async function getFilesFromGlob(
  ignoreGlobs: string[],
  applyEslintIgnore: boolean,
  applyPrettierIgnore: boolean,
  fileGlob: string,
  cliOptions: CliOptions,
): Promise<string[]> {
  const globOptions = { dot: cliOptions.includeDotFiles, ignore: ignoreGlobs };
  if (!fileGlob.includes('node_modules')) {
    // basically, we're going to protect you from doing something
    // not smart unless you explicitly include it in your glob
    globOptions.ignore.push('**/node_modules/**');
  }

  const filePaths = await glob(fileGlob, globOptions);
  const filteredFilePaths: string[] = [];

  for (const filePath of filePaths) {
    if (applyEslintIgnore && (await isFilePathIgnored(filePath, 'eslint'))) {
      continue;
    }

    if (
      applyPrettierIgnore &&
      (await isFilePathIgnored(filePath, 'prettier'))
    ) {
      continue;
    }

    filteredFilePaths.push(filePath);
  }

  return filteredFilePaths;
}

async function formatFile(
  filePath: string,
  prettierESLintOptions: FormatOptions,
  cliOptions: CliOptions,
): Promise<FileInfo> {
  const fileInfo: FileInfo = { filePath };

  try {
    const text = await fs.readFile(filePath, 'utf8');
    fileInfo.text = text;
    fileInfo.formatted = await format({
      text,
      filePath,
      ...prettierESLintOptions,
    });
    fileInfo.unchanged = fileInfo.text === fileInfo.formatted;

    if (cliOptions.write) {
      if (!fileInfo.unchanged) {
        await fs.writeFile(filePath, fileInfo.formatted);
      }
    } else if (cliOptions.listDifferent) {
      if (!fileInfo.unchanged) {
        process.exitCode = 1;
        console.log(fileInfo.filePath);
      }
    } else {
      process.stdout.write(fileInfo.formatted);
    }

    return fileInfo;
  } catch (error) {
    logger.error(
      `There was an error formatting "${fileInfo.filePath}":`,
      `\n${indentString((error as Error).stack!, INDENT_COUNT)}`,
    );
    return { ...fileInfo, error };
  }
}

async function mapLimit<T, U>(
  items: T[],
  limit: number,
  mapper: (item: T) => Promise<U>,
): Promise<U[]> {
  const results: U[] = [];
  let index = 0;

  await Promise.all(
    Array.from(
      { length: Math.min(limit, items.length) },
      async (): Promise<void> => {
        while (index < items.length) {
          const currentIndex = index;
          index += 1;
          results[currentIndex] = await mapper(items[currentIndex]);
        }
      },
    ),
  );

  return results;
}

function getNearestEslintignorePath(filePath: string): string | undefined {
  const { dir } = path.parse(filePath);
  if (!eslintignorePathCache.has(dir)) {
    eslintignorePathCache.set(dir, findUpSync('.eslintignore', { cwd: dir }));
  }
  return eslintignorePathCache.get(dir);
}

function getNearestPrettierignorePath(filePath: string): string | undefined {
  const { dir } = path.parse(filePath);
  if (!prettierignorePathCache.has(dir)) {
    prettierignorePathCache.set(
      dir,
      findUpSync('.prettierignore', { cwd: dir }),
    );
  }
  return prettierignorePathCache.get(dir);
}

async function isFilePathIgnored(
  filePath: string,
  ignoreType: 'eslint' | 'prettier',
): Promise<boolean> {
  const ignorePath =
    ignoreType === 'eslint'
      ? getNearestEslintignorePath(filePath)
      : getNearestPrettierignorePath(filePath);

  if (!ignorePath) {
    return false;
  }

  const ignoreDir = path.parse(ignorePath).dir;
  const filePathRelativeToIgnoreDir = path.relative(ignoreDir, filePath);
  const isIgnored = await getIsIgnoredFromCache(ignorePath);
  return isIgnored(filePathRelativeToIgnoreDir);
}

function getIsIgnoredFromCache(
  filename: string,
): Promise<(_filePath: string) => boolean> {
  const cached = isIgnoredCache.get(filename);
  if (cached) {
    return cached;
  }

  const isIgnored = getIsIgnored(filename);
  isIgnoredCache.set(filename, isIgnored);
  return isIgnored;
}

async function getIsIgnored(
  filename: string,
): Promise<(_filePath: string) => boolean> {
  const ignoreFile = await fs.readFile(filename, 'utf8');
  const ignoreLines = ignoreFile
    .split(LINE_SEPARATOR_REGEX)
    .filter(line => Boolean(line.trim()));
  const instance = nodeIgnore();
  instance.add(ignoreLines);
  return instance.ignores.bind(instance);
}
