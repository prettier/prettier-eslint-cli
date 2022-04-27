/* eslint no-console:0 */
/* eslint complexity:[1, 7] */
import path from "path";
import fs from "fs";
import glob from "glob";
import { bindNodeCallback, from, of } from "rxjs";
import { catchError, concatAll, distinct, map, mergeMap } from "rxjs/operators";
import format from "prettier-eslint";
import chalk from "chalk";
import getStdin from "get-stdin";
import nodeIgnore from "ignore";
import findUp from "find-up";
import memoize from "lodash.memoize";
import indentString from "indent-string";
import getLogger from "loglevel-colored-level-prefix";
import * as messages from "./messages";

const LINE_SEPERATOR_REGEX = /(\r|\n|\r\n)/;
const rxGlob = bindNodeCallback(glob);
const rxReadFile = bindNodeCallback(fs.readFile);
const rxWriteFile = bindNodeCallback(fs.writeFile);
const findUpEslintignoreSyncMemoized = memoize(
  findUpEslintignoreSync,
  findUpMemoizeResolver
);
const findUpPrettierignoreSyncMemoized = memoize(
  findUpPrettierignoreSync,
  findUpMemoizeResolver
);

const getIsIgnoredMemoized = memoize(getIsIgnored);

const logger = getLogger({ prefix: "prettier-eslint-cli" });

export default formatFilesFromArgv;

function formatFilesFromArgv({
  _: fileGlobs,
  $0: _$0, //eslint-disable-line
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
  ...prettierOptions
}) {
  logger.setLevel(logLevel);
  const prettierESLintOptions = {
    logLevel,
    eslintPath,
    prettierPath,
    prettierLast,
    prettierOptions
  };

  if (eslintConfigPath) {
    prettierESLintOptions.eslintConfig = {
      overrideConfigFile: eslintConfigPath
    };
  }

  const cliOptions = { write, listDifferent };
  if (stdin) {
    return formatStdin({ filePath: stdinFilepath, ...prettierESLintOptions });
  } else {
    return formatFilesFromGlobs({
      fileGlobs,
      ignoreGlobs: [...ignoreGlobs], // make a copy to avoid manipulation
      cliOptions,
      prettierESLintOptions,
      applyEslintIgnore,
      applyPrettierIgnore
    });
  }
}

async function formatStdin(prettierESLintOptions) {
  const stdinValue = (await getStdin()).trim();
  try {
    const formatted = await format({
      text: stdinValue,
      ...prettierESLintOptions
    });
    process.stdout.write(formatted);
    return Promise.resolve(formatted);
  } catch (error) {
    logger.error(
      "There was a problem trying to format the stdin text",
      `\n${indentString(error.stack, 4)}`
    );
    process.exitCode = 1;
    return Promise.resolve(stdinValue);
  }
}

function formatFilesFromGlobs({
  fileGlobs,
  ignoreGlobs,
  cliOptions,
  prettierESLintOptions,
  applyEslintIgnore,
  applyPrettierIgnore
}) {
  const concurrentGlobs = 3;
  const concurrentFormats = 10;
  return new Promise((resolve) => {
    const successes = [];
    const failures = [];
    const unchanged = [];
    from(fileGlobs)
      .pipe(
        mergeMap(
          getFilesFromGlob.bind(
            null,
            ignoreGlobs,
            applyEslintIgnore,
            applyPrettierIgnore
          ),
          null,
          concurrentGlobs
        ),
        concatAll(),
        distinct(),
        mergeMap(filePathToFormatted, null, concurrentFormats)
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
        "There was an unhandled error while formatting the files",
        `\n${indentString(error.stack, 4)}`
      );
      process.exitCode = 1;
      resolve({ error, successes, failures });
    }

    function onComplete() {
      const isNotSilent = logger.getLevel() !== logger.levels.SILENT;

      /* use console.error directly here because
       * - we don't want these messages prefixed
       * - we want them to go to stderr, not stdout
       */
      if (successes.length && isNotSilent) {
        console.error(
          messages.success({
            success: chalk.green("success"),
            count: successes.length,
            countString: chalk.bold(successes.length)
          })
        );
      }
      if (failures.length && isNotSilent) {
        process.exitCode = 1;
        console.error(
          messages.failure({
            failure: chalk.red("failure"),
            count: failures.length,
            countString: chalk.bold(failures.length)
          })
        );
      }
      if (unchanged.length && isNotSilent) {
        console.error(
          messages.unchanged({
            unchanged: chalk.gray("unchanged"),
            count: unchanged.length,
            countString: chalk.bold(unchanged.length)
          })
        );
      }
      resolve({ successes, failures });
    }
  });
}

function getFilesFromGlob(
  ignoreGlobs,
  applyEslintIgnore,
  applyPrettierIgnore,
  fileGlob
) {
  const globOptions = { ignore: ignoreGlobs };
  if (!fileGlob.includes("node_modules")) {
    // basically, we're going to protect you from doing something
    // not smart unless you explicitly include it in your glob
    globOptions.ignore.push("**/node_modules/**");
  }
  return rxGlob(fileGlob, globOptions).pipe(
    map((filePaths) => {
      return filePaths.filter((filePath) => {
        if (applyEslintIgnore && isFilePathMatchedByEslintignore(filePath)) {
          return false;
        }

        if (
          applyPrettierIgnore &&
          isFilePathMatchedByPrettierignore(filePath)
        ) {
          return false;
        }

        return true;
      });
    })
  );
}

function formatFile(filePath, prettierESLintOptions, cliOptions) {
  const fileInfo = { filePath };
  let format$ = rxReadFile(filePath, "utf8").pipe(
    mergeMap(async (text) => {
      fileInfo.text = text;
      fileInfo.formatted = await format({
        text,
        filePath,
        ...prettierESLintOptions
      });
      fileInfo.unchanged = fileInfo.text === fileInfo.formatted;
      return fileInfo;
    })
  );

  if (cliOptions.write) {
    format$ = format$.pipe(
      mergeMap((info) => {
        if (info.unchanged) {
          return of(info);
        } else {
          return rxWriteFile(filePath, info.formatted).pipe(map(() => info));
        }
      })
    );
  } else if (cliOptions.listDifferent) {
    format$ = format$.pipe(
      map((info) => {
        if (!info.unchanged) {
          process.exitCode = 1;
          console.log(info.filePath);
        }
        return info;
      })
    );
  } else {
    format$ = format$.pipe(
      map((info) => {
        process.stdout.write(info.formatted);
        return info;
      })
    );
  }

  return format$.pipe(
    catchError((error) => {
      logger.error(
        `There was an error formatting "${fileInfo.filePath}":`,
        `\n${indentString(error.stack, 4)}`
      );
      return of(Object.assign(fileInfo, { error }));
    })
  );
}

function getNearestEslintignorePath(filePath) {
  const { dir } = path.parse(filePath);
  return findUpEslintignoreSyncMemoized(".eslintignore", dir);
}

function isFilePathMatchedByEslintignore(filePath) {
  const eslintignorePath = getNearestEslintignorePath(filePath);
  if (!eslintignorePath) {
    return false;
  }

  const eslintignoreDir = path.parse(eslintignorePath).dir;
  const filePathRelativeToEslintignoreDir = path.relative(
    eslintignoreDir,
    filePath
  );
  const isIgnored = getIsIgnoredMemoized(eslintignorePath);
  return isIgnored(filePathRelativeToEslintignoreDir);
}

function getNearestPrettierignorePath(filePath) {
  const { dir } = path.parse(filePath);
  return findUpPrettierignoreSyncMemoized(".prettierignore", dir);
}

function isFilePathMatchedByPrettierignore(filePath) {
  const prettierignorePath = getNearestPrettierignorePath(filePath);
  if (!prettierignorePath) {
    return false;
  }

  const prettierignoreDir = path.parse(prettierignorePath).dir;
  const filePathRelativeToPrettierignoreDir = path.relative(
    prettierignoreDir,
    filePath
  );
  const isIgnored = getIsIgnoredMemoized(prettierignorePath);
  return isIgnored(filePathRelativeToPrettierignoreDir);
}

function findUpMemoizeResolver(...args) {
  return args.join("::");
}

function findUpEslintignoreSync(filename, cwd) {
  return findUp.sync(".eslintignore", { cwd });
}

function findUpPrettierignoreSync(filename, cwd) {
  return findUp.sync(".prettierignore", { cwd });
}

function getIsIgnored(filename) {
  const ignoreLines = fs
    .readFileSync(filename, "utf8")
    .split(LINE_SEPERATOR_REGEX)
    .filter((line) => Boolean(line.trim()));
  const instance = nodeIgnore();
  instance.add(ignoreLines);
  return instance.ignores.bind(instance);
}
