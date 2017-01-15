import fs from 'fs'
import format from 'prettier-eslint'
import pify from 'pify'
import glob from 'glob'

const pReadFile = pify(fs.readFile)
const pWriteFile = pify(fs.writeFile)
const pGlob = pify(glob)

export default formatFilesFromArgv

async function formatFilesFromArgv({
  _: fileGlobs,
  log: enableLog,
}) {
  const options = {disableLog: !enableLog}
  const filesPromises = fileGlobs.map(fileGlob => pGlob(fileGlob))
  // TODO: handle errors!
  const allFiles = await Promise.all(filesPromises)
  const flatFiles = [].concat(...allFiles)
  const uniqueFiles = Array.from(new Set(flatFiles))
  const formatPromises = uniqueFiles.map(file => formatFile(file, options))
  await Promise.all(formatPromises)
}

async function formatFile(filePath, options) {
  const text = await pReadFile(filePath, 'utf8')
  const formatted = format({text, filePath, ...options})
  await pWriteFile(filePath, formatted)
}
