import fs from 'fs'
import glob from 'glob'
import Rx from 'rxjs/Rx'
import format from 'prettier-eslint'

const rxGlob = Rx.Observable.bindNodeCallback(glob)
const rxReadFile = Rx.Observable.bindNodeCallback(fs.readFile)
const rxWriteFile = Rx.Observable.bindNodeCallback(fs.writeFile)

export default formatFilesFromArgv

async function formatFilesFromArgv({
  _: fileGlobs,
  log: enableLog,
}) {
  const options = {disableLog: !enableLog}
  const concurrentGlobs = 3
  const concurrentFormats = 10
  return Rx.Observable.from(fileGlobs)
    .mergeMap(fileGlob => rxGlob(fileGlob), null, concurrentGlobs)
    .concatAll()
    .distinct()
    .mergeMap(filePath => formatFile(filePath, options), null, concurrentFormats)
    .subscribe()
}

function formatFile(filePath, options) {
  return rxReadFile(filePath, 'utf8')
    .map(text => format({text, filePath, ...options}))
    .mergeMap(formatted => (
      rxWriteFile(filePath, formatted)
        .map(() => filePath)
    ))
}
