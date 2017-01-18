/* eslint no-console:0 */
import fs from 'fs'
import glob from 'glob'
import Rx from 'rxjs/Rx'
import format from 'prettier-eslint'
import chalk from 'chalk'
import getStdin from 'get-stdin'

const rxGlob = Rx.Observable.bindNodeCallback(glob)
const rxReadFile = Rx.Observable.bindNodeCallback(fs.readFile)
const rxWriteFile = Rx.Observable.bindNodeCallback(fs.writeFile)

export default formatFilesFromArgv

async function formatFilesFromArgv({
  _: fileGlobs,
  log: enableLog,
  stdin,
  write,
  eslintPath,
  prettierPath,
}) {
  const prettierESLintOptions = {disableLog: !enableLog, eslintPath, prettierPath}
  const cliOptions = {write}
  if (stdin) {
    return formatStdin(prettierESLintOptions)
  } else {
    return formatFilesFromGlobs(fileGlobs, cliOptions, prettierESLintOptions)
  }
}

async function formatStdin(prettierESLintOptions) {
  const stdinValue = (await getStdin()).trim()
  const formatted = format({text: stdinValue, ...prettierESLintOptions})
  console.log(formatted)
  return Promise.resolve(formatted)
}

function formatFilesFromGlobs(fileGlobs, cliOptions, prettierESLintOptions) {
  const concurrentGlobs = 3
  const concurrentFormats = 10
  return Rx.Observable.from(fileGlobs)
    .mergeMap(getFilesFromGlob, null, concurrentGlobs)
    .concatAll()
    .distinct()
    .mergeMap(filePath => formatFile(filePath, prettierESLintOptions, cliOptions), null, concurrentFormats)
    .toArray()
    .toPromise()
    .then(allWrittenFiles => {
      const count = chalk.bold(allWrittenFiles.length)
      console.log(
        `${chalk.green('success')} formatting ${count} files with prettier-eslint ✨`,
      )
      return allWrittenFiles
    })
}

function getFilesFromGlob(fileGlob) {
  const globOptions = {ignore: []}
  if (!fileGlob.includes('node_modules')) {
    // basically, we're going to protect you from doing something
    // not smart unless you explicitly include it in your glob
    globOptions.ignore.push('**/node_modules/**')
  }
  return rxGlob(fileGlob, globOptions)
}

function formatFile(filePath, prettierESLintOptions, cliOptions) {
  const format$ = rxReadFile(filePath, 'utf8')
    .map(text => format({text, filePath, ...prettierESLintOptions}))
  if (cliOptions.write) {
    return format$.mergeMap(formatted => (
      rxWriteFile(filePath, formatted)
        .map(() => filePath)
    ))
  } else {
    return format$.map(formatted => {
      console.log(formatted)
      return filePath
    })
  }
}
