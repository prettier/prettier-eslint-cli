import fs from 'node:fs';
import path from 'node:path';

import indentString from '@esm2cjs/indent-string';
import chalk from 'chalk-cjs';
import findUp from 'find-up';
import getStdin from 'get-stdin';
import { glob } from 'glob';
import nodeIgnore from 'ignore';
import memoize from 'lodash.memoize';
import getLogger from 'loglevel-colored-level-prefix';
import { bindNodeCallback, from, of } from 'rxjs';
import { catchError, concatAll, distinct, map, mergeMap } from 'rxjs/operators';

import * as messages from './messages';
import format from './prettier-eslint';

const INDENT_COUNT = 4;

const LINE_SEPARATOR_REGEX = /\r|\r?\n/;

const rxReadFile = bindNodeCallback(fs.readFile);
const rxWriteFile = bindNodeCallback(fs.writeFile);
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
  _: fileGlobs,
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
}) {
  logger.setLevel(logLevel);
  const prettierESLintOptions = {
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

async function formatStdin(prettierESLintOptions) {
  const stdin = await getStdin();
  const stdinValue = stdin.trim();
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
      `\n${indentString(error.stack, INDENT_COUNT)}`,
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
}) {
  const concurrentGlobs = 3;
  const concurrentFormats = 10;
  return new Promise(resolve => {
    const successes = [];
    const failures = [];
    const unchanged = [];
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
          null,
          concurrentGlobs,
        ),
        concatAll(),
        distinct(),
        mergeMap(filePathToFormatted, null, concurrentFormats),
      )
      .subscribe(onNext, onError, onComplete);

    function filePathToFormatted(filePath) {
      const absoluteFilePath = path.resolve(filePath);
      return formatFile(absoluteFilePath, prettierESLintOptions, cliOptions);
    }

    function onNext(info) {
      if (info.error) {
        failures.push(info);
      } else if (info.unchanged) {
        unchanged.push(info);
      } else {
        successes.push(info);
      }
    }

    function onError(error) {
      logger.error(
        'There was an unhandled error while formatting the files',
        `\n${indentString(error.stack, INDENT_COUNT)}`,
      );
      process.exitCode = 1;
      resolve({ error, successes, failures });
    }

    function onComplete() {
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
  ignoreGlobs,
  applyEslintIgnore,
  applyPrettierIgnore,
  fileGlob,
  cliOptions,
) {
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

function formatFile(filePath, prettierESLintOptions, cliOptions) {
  const fileInfo = { filePath };
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
        return rxWriteFile(filePath, info.formatted).pipe(map(() => info));
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
        process.stdout.write(info.formatted);
        return info;
      }),
    );
  }

  return format$.pipe(
    catchError(error => {
      logger.error(
        `There was an error formatting "${fileInfo.filePath}":`,
        `\n${indentString(error.stack, INDENT_COUNT)}`,
      );
      return of(Object.assign(fileInfo, { error }));
    }),
  );
}

function getNearestEslintignorePath(filePath) {
  const { dir } = path.parse(filePath);
  return findUpEslintignoreSyncMemoized('.eslintignore', dir);
}

function isFilePathMatchedByEslintignore(filePath) {
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

function getNearestPrettierignorePath(filePath) {
  const { dir } = path.parse(filePath);
  return findUpPrettierignoreSyncMemoized('.prettierignore', dir);
}

function isFilePathMatchedByPrettierignore(filePath) {
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

function findUpMemoizeResolver(...args) {
  return args.join('::');
}

function findUpEslintignoreSync(filename, cwd) {
  return findUp.sync('.eslintignore', { cwd });
}

function findUpPrettierignoreSync(filename, cwd) {
  return findUp.sync('.prettierignore', { cwd });
}

function getIsIgnored(filename) {
  const ignoreLines = fs
    .readFileSync(filename, 'utf8')
    .split(LINE_SEPARATOR_REGEX)
    .filter(line => Boolean(line.trim()));
  const instance = nodeIgnore();
  instance.add(ignoreLines);
  return instance.ignores.bind(instance);
}
