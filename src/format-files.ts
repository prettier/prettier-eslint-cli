import fs from 'node:fs/promises';
import path from 'node:path';
import { text } from 'node:stream/consumers';
import { pathToFileURL } from 'node:url';

import { ConfigArray } from '@eslint/config-array';
import { hfs } from '@humanfs/node';
import type { FormatOptions } from '@prettier/eslint';
import chalk from 'chalk';
import { ESLint } from 'eslint';
import { findUpSync } from 'find-up';
import globParent from 'glob-parent';
import nodeIgnore from 'ignore';
import indentString from 'indent-string';
import type { LogLevelDesc } from 'loglevel';
import { Minimatch } from 'minimatch';
import type { Options as PrettierOptions } from 'prettier';

import { logger } from './logger.ts';
import * as messages from './messages.ts';
import { format } from './prettier-eslint.ts';

const INDENT_COUNT = 4;

// basically, we're going to protect you from doing something
// not smart unless you explicitly include it in your glob
const DEFAULT_ESLINT_IGNORES = ['**/node_modules/', '.git/'];

const LINE_SEPARATOR_REGEX = /\r|\r?\n/;
const WINDOWS_PATH_SEPARATOR_REGEX = /\\/g;

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
  eslintConfigPath?: string;
  includeDotFiles?: boolean;
  ignoreGlobs: string[];
  listDifferent?: boolean;
  write?: boolean;
}

interface FormatFilesFromGlobsOptions {
  applyEslintIgnore: boolean;
  applyPrettierIgnore: boolean;
  cliOptions: CliOptions;
  fileGlobs: string[];
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

const configArrayCache = new Map<string, Promise<ConfigArray>>();
const prettierignorePathCache = new Map<string, string | undefined>();
const isIgnoredCache = new Map<
  string,
  Promise<(_filePath: string) => boolean>
>();

export function clearFormatFilesCaches() {
  configArrayCache.clear();
  prettierignorePathCache.clear();
  isIgnoredCache.clear();
}

export async function formatFiles({
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

  const cliOptions = {
    write,
    listDifferent,
    includeDotFiles,
    eslintConfigPath,
    ignoreGlobs: [...ignoreGlobs], // make a copy to avoid manipulation
  };
  if (stdin) {
    return formatStdin({ filePath: stdinFilepath, ...prettierESLintOptions });
  }
  return formatFilesFromGlobs({
    fileGlobs,
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
  applyEslintIgnore: boolean,
  applyPrettierIgnore: boolean,
  fileGlob: string,
  cliOptions: CliOptions,
): Promise<string[]> {
  const absoluteGlob = path.resolve(fileGlob);
  const basePath = globParent(absoluteGlob);
  const pattern = normalizePathForGlob(path.relative(basePath, absoluteGlob));
  const matcher = new Minimatch(pattern, { dot: cliOptions.includeDotFiles });

  const configArray = await getConfigArray(
    cliOptions.eslintConfigPath,
    cliOptions.ignoreGlobs,
    applyEslintIgnore,
  );

  const filePaths: string[] = [];

  try {
    if (await hfs.isDirectory(basePath)) {
      for await (const entry of hfs.walk(basePath, {
        directoryFilter(dirEntry) {
          const absolutePath = path.resolve(basePath, dirEntry.path);
          return !configArray.isDirectoryIgnored(absolutePath);
        },
        entryFilter(entry) {
          if (entry.isDirectory) {
            return false;
          }

          // eslint-disable-next-line unicorn-x/prefer-regexp-test
          if (!matcher.match(entry.path)) {
            return false;
          }

          const absolutePath = path.resolve(basePath, entry.path);
          if (configArray.isFileIgnored(absolutePath)) {
            return false;
          }

          return true;
        },
      })) {
        filePaths.push(path.resolve(basePath, entry.path));
      }
    }
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== 'ENOENT' && code !== 'ENOTDIR') {
      throw error;
    }
  }

  if (!applyPrettierIgnore) {
    return filePaths;
  }

  const ignoredStatuses = await Promise.all(filePaths.map(isFilePathIgnored));
  return filePaths.filter((_, index) => !ignoredStatuses[index]);
}

function normalizePathForGlob(filePath: string): string {
  return path.posix.normalize(
    filePath.replaceAll(WINDOWS_PATH_SEPARATOR_REGEX, '/'),
  );
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

async function getConfigArray(
  eslintConfigPath: string | undefined,
  ignoreGlobs: string[],
  applyEslintIgnore: boolean,
): Promise<ConfigArray> {
  const cacheKey = [
    process.cwd(),
    applyEslintIgnore,
    eslintConfigPath ?? '',
    ...ignoreGlobs,
  ].join('\0');
  const cached = configArrayCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const configArray = loadConfigArray(
    eslintConfigPath,
    ignoreGlobs,
    applyEslintIgnore,
  );
  configArrayCache.set(cacheKey, configArray);
  return configArray;
}

async function loadConfigArray(
  eslintConfigPath: string | undefined,
  ignoreGlobs: string[],
  applyEslintIgnore: boolean,
): Promise<ConfigArray> {
  const configs: unknown[] = [];

  if (applyEslintIgnore) {
    configs.push({ ignores: DEFAULT_ESLINT_IGNORES });

    const configPath = eslintConfigPath
      ? path.resolve(eslintConfigPath)
      : await new ESLint().findConfigFile();

    if (configPath) {
      const configBasePath = path.dirname(configPath);
      const configModule = (await import(pathToFileURL(configPath).href)) as {
        default?: unknown;
      };
      const rawConfig = Object.hasOwn(configModule, 'default')
        ? configModule.default
        : configModule;
      const configsToAdd = Array.isArray(rawConfig) ? rawConfig : [rawConfig];
      configs.push(
        ...configsToAdd.map(config =>
          applyConfigBasePath(config, configBasePath),
        ),
      );
    }
  }

  if (ignoreGlobs.length > 0) {
    configs.push({
      ignores: ignoreGlobs,
    });
  }

  const array = new ConfigArray(configs, { basePath: process.cwd() });
  await array.normalize();
  return array;
}

function applyConfigBasePath(config: unknown, configBasePath: string): unknown {
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    return config;
  }

  const { basePath, files, ignores } = config as {
    basePath?: unknown;
    files?: unknown;
    ignores?: unknown;
  };

  const ignoreConfig = {} as {
    basePath?: unknown;
    files?: unknown;
    ignores?: unknown;
  };

  if (files !== undefined) {
    ignoreConfig.files = files;
  }

  if (ignores !== undefined) {
    ignoreConfig.ignores = ignores;
  }

  if (Object.hasOwn(config, 'basePath')) {
    ignoreConfig.basePath =
      typeof basePath === 'string' && !path.isAbsolute(basePath)
        ? path.resolve(configBasePath, basePath)
        : basePath;
  } else {
    ignoreConfig.basePath = configBasePath;
  }

  return ignoreConfig;
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

async function isFilePathIgnored(filePath: string): Promise<boolean> {
  const ignorePath = getNearestPrettierignorePath(filePath);

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

async function getIgnoreGlobs(filename: string): Promise<string[]> {
  const ignoreFile = await fs.readFile(filename, 'utf8');
  return ignoreFile
    .split(LINE_SEPARATOR_REGEX)
    .filter(line => Boolean(line.trim()));
}

async function getIsIgnored(
  filename: string,
): Promise<(_filePath: string) => boolean> {
  const instance = nodeIgnore();
  instance.add(await getIgnoreGlobs(filename));
  return instance.ignores.bind(instance);
}
