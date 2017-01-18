import fs from 'fs'
import glob from 'glob'
import Rx from 'rxjs/Rx'
import format from 'prettier-eslint'
import chalk from 'chalk'

const rxGlob = Rx.Observable.bindNodeCallback(glob)
const rxReadFile = Rx.Observable.bindNodeCallback(fs.readFile)
const rxWriteFile = Rx.Observable.bindNodeCallback(fs.writeFile)

export default formatFilesFromArgv

function formatFilesFromArgv({
  _: fileGlobs,
  log: enableLog,
  eslintPath,
  prettierPath,
}) {
  const options = {disableLog: !enableLog, eslintPath, prettierPath}
  const concurrentGlobs = 3
  const concurrentFormats = 10
  return Rx.Observable.from(fileGlobs)
    .mergeMap(getFilesFromGlob, null, concurrentGlobs)
    .concatAll()
    .distinct()
    .mergeMap(filePath => formatFile(filePath, options), null, concurrentFormats)
    .toArray()
    .toPromise()
    .then(allWrittenFiles => {
      /* eslint no-console:0 */
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

function formatFile(filePath, options) {
  return rxReadFile(filePath, 'utf8')
    .map(text => format({text, filePath, ...options}))
    .mergeMap(formatted => (
      rxWriteFile(filePath, formatted)
        .map(() => filePath)
    ))
}
