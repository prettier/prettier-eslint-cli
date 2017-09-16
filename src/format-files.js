/* eslint no-console:0 */
import path from "path";
import fs from "fs";
import glob from "glob";
import { Observable } from "rxjs";
import format from "prettier-eslint";
import chalk from "chalk";
import getStdin from "get-stdin";
import nodeIgnore from "ignore";
import findUp from "find-up";
import memoize from "lodash.memoize";
import indentString from "indent-string";
import getLogger from "loglevel-colored-level-prefix";
import ConfigFile from "eslint/lib/config/config-file";
import Linter from "eslint/lib/linter";
import Config from "eslint/lib/config";
import * as messages from "./messages";

const LINE_SEPERATOR_REGEX = /(\r|\n|\r\n)/;
const rxGlob = Observable.bindNodeCallback(glob);
const rxReadFile = Observable.bindNodeCallback(fs.readFile);
const rxWriteFile = Observable.bindNodeCallback(fs.writeFile);
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
  $0: _$0,
  help: _help,
  h: _help_,
  version: _version,
  logLevel = logger.getLevel(),
  l: _logLevelAlias,
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
    const configContext = new Config({}, new Linter());
    prettierESLintOptions.eslintConfig = ConfigFile.load(
      eslintConfigPath,
      configContext
    );
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
    const formatted = format({ text: stdinValue, ...prettierESLintOptions });
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
  return new Promise(resolve => {
    const successes = [];
    const failures = [];
    const unchanged = [];
    Observable.from(fileGlobs)
      .mergeMap(
        getFilesFromGlob.bind(
          null,
          ignoreGlobs,
          applyEslintIgnore,
          applyPrettierIgnore
        ),
        null,
        concurrentGlobs
      )
      .concatAll()
      .distinct()
      .mergeMap(filePathToFormatted, null, concurrentFormats)
      .subscribe(onNext, onError, onComplete);

    function filePathToFormatted(filePath) {
      return formatFile(filePath, prettierESLintOptions, cliOptions);
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
  return rxGlob(fileGlob, globOptions).map(filePaths => {
    return filePaths.filter(filePath => {
      if (applyEslintIgnore && isFilePathMatchedByEslintignore(filePath)) {
        return false;
      }

      if (applyPrettierIgnore && isFilePathMatchedByPrettierignore(filePath)) {
        return false;
      }

      return true;
    });
  });
}

function formatFile(filePath, prettierESLintOptions, cliOptions) {
  const fileInfo = { filePath };
  let format$ = rxReadFile(filePath, "utf8").map(text => {
    fileInfo.text = text;
    fileInfo.formatted = format({ text, filePath, ...prettierESLintOptions });
    fileInfo.unchanged = fileInfo.text === fileInfo.formatted;
    return fileInfo;
  });

  if (cliOptions.write) {
    format$ = format$.mergeMap(info => {
      if (info.unchanged) {
        return Observable.of(info);
      } else {
        return rxWriteFile(filePath, info.formatted).map(() => info);
      }
    });
  } else if (cliOptions.listDifferent) {
    format$ = format$.map(info => {
      if (!info.unchanged) {
        process.exitCode = 1;
        console.log(info.filePath);
      }
      return info;
    });
  } else {
    format$ = format$.map(info => {
      process.stdout.write(info.formatted);
      return info;
    });
  }

  return format$.catch(error => {
    logger.error(
      `There was an error formatting "${fileInfo.filePath}":`,
      `\n${indentString(error.stack, 4)}`
    );
    return Observable.of(Object.assign(fileInfo, { error }));
  });
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
    .filter(line => Boolean(line.trim()));
  const instance = nodeIgnore();
  instance.add(ignoreLines);
  return instance.ignores.bind(instance);
}
