import path from 'path'
import fs from 'fs'
import spawn from 'spawn-command'
import pify from 'pify'
// import glob from 'glob'
// import yargsParser from 'yargs-parser'

const pWriteFile = pify(fs.writeFile)
const pReadFile = pify(fs.readFile)
const pUnlink = pify(fs.unlink)

// this is a bit of a long running test...
jasmine.DEFAULT_TIMEOUT_INTERVAL = 20000 // eslint-disable-line no-undef

const PRETTIER_ESLINT_PATH = require.resolve('../../src/index')
const BABEL_BIN_PATH = require.resolve('babel-cli/bin/babel-node')

test('prettier-eslint --help', () => {
  return runPrettierESLintCLI('--help').then(stdout => {
    expect(stdout).toMatchSnapshot('stdout: prettier-eslint --help')
  })
})

test('prettier-eslint --version', () => {
  return runPrettierESLintCLI('--version').then(stdout => {
    expect(stdout).toMatchSnapshot('stdout: prettier-eslint --version')
  })
})

test('prettier-eslint cli-test/fixtures/*1.js cli-test/fixtures/*2.js', async () => {
  const example1Path = path.resolve(__dirname, '../fixtures/example1.js')
  const example2Path = path.resolve(__dirname, '../fixtures/example2.js')
  const example1 = `const {  example1  }  =  baz.bar`
  const example2 = `function example2(thing){return thing;};;;;;;;;;`
  await Promise.all([
    pWriteFile(example1Path, example1),
    pWriteFile(example2Path, example2),
  ])
  const stdout = await runPrettierESLintCLI('cli-test/fixtures/*1.js cli-test/fixtures/*2.js')
  expect(stdout).toMatchSnapshot('stdout: prettier-eslint cli-test/fixtures/*1.js cli-test/fixtures/*2.js')
  const [example1Result, example2Result] = await Promise.all([
    pReadFile(example1Path, 'utf8'),
    pReadFile(example2Path, 'utf8'),
  ])
  expect({example1Result, example2Result}).toMatchSnapshot('file contents: prettier-eslint cli-test/fixtures/*1.js cli-test/fixtures/*2.js')
  await Promise.all([
    pUnlink(example1Path),
    pUnlink(example2Path),
  ])
})

// testCLIOutput('generate', 'generate')
// testCLIOutput('generate --templates-dir guides --exercises-dir app --exercises-final-dir app-finished', 'generate-with-args')
// testCLIOutput('generate --no-clean=true --exercises-dir src --exercises-final-dir src-final', 'generate-no-clean')
// testCLIOutput('generate --ignore "**/*.ignore-me.js"', 'generate-ignore-one')
// testCLIOutput('generate --ignore "**/*.ignore-me.js" "**/*.no-copy.js"', 'generate-ignore-multiple')
// testCLIOutput('generate --silent-success', 'generate-silent-success')
// testCLIOutput('generate --silent-all', 'generate-silent-all')

// function testCLIOutput(args, fixture) {
//   test(`prettier-eslint ${args}`, () => {
//     return runCLIAndAssertFileOutput(args, path.resolve(__dirname, `../../test/fixtures/${fixture}`))
//   })
// }

// async function runCLIAndAssertFileOutput(args, cwd) {
//   const {exercisesDir = './exercises', exercisesFinalDir = './exercises-final'} = yargsParser(args)
//   const stdout = await runPrettierESLintCLI(args, cwd).catch(getErrorLogger('runPrettierESLintCLI'))
//   const snapshotTitleBase = `${args} in ${relativeizePath(cwd)}`
//   expect(relativeizePath(stdout)).toMatchSnapshot(`${snapshotTitleBase} stdout`)
//   const tree = dirTree(cwd)
//   relativeizePathInTree(tree)
//   expect(tree).toMatchSnapshot(`${snapshotTitleBase} file tree`)
//   // cannot use Promise.all here because we need to make sure the snapshots are
//   // taken in the correct order
//   await expectDirectoryToMatchSnapshot(path.resolve(cwd, exercisesDir), `${snapshotTitleBase} exercises-dir`)
//   await expectDirectoryToMatchSnapshot(path.resolve(cwd, exercisesFinalDir), `${snapshotTitleBase} exercises-final-dir`)
// }

// function expectDirectoryToMatchSnapshot(directory, snapshotTitle) {
//   return pify(glob)(path.resolve(directory, '**/*'), {nodir: true})
//     .then(readAllFilesAsPromise)
//     .then(expectFilesToMatchSnapshot)
//     .catch(getErrorLogger(`expectDirectoryToMatchSnapshot(${directory})`))
//
//   function readAllFilesAsPromise(files) {
//     const allPromises = files.map(readFileAsPromise)
//     return Promise.all(allPromises)
//   }
//
//   function readFileAsPromise(file) {
//     return pify(fs.readFile)(file, 'utf8')
//       .then(contents => ({file: relativeizePath(file), contents}))
//       .catch(getErrorLogger(`readFileAsPromise(${file})`))
//   }
//
//   function expectFilesToMatchSnapshot(files) {
//     expect(files).toMatchSnapshot(snapshotTitle)
//   }
// }

function runPrettierESLintCLI(args = '', cwd = process.cwd()) {
  const isRelative = cwd[0] !== '/'
  if (isRelative) {
    cwd = path.resolve(__dirname, cwd)
  }

  return new Promise((resolve, reject) => {
    let stdout = ''
    let stderr = ''
    const command = `${BABEL_BIN_PATH} -- ${PRETTIER_ESLINT_PATH} ${args}`
    const child = spawn(command, {cwd})

    child.on('error', error => {
      reject(error)
    })

    child.stdout.on('data', data => {
      stdout += data.toString()
    })

    child.stderr.on('data', data => {
      stderr += data.toString()
    })

    child.on('close', () => {
      if (stderr) {
        reject(stderr)
      } else {
        resolve(stdout)
      }
    })
  })
}

// function relativeizePath(stringWithAbsolutePaths) {
//   return stringWithAbsolutePaths.replace(new RegExp(path.resolve(__dirname, '../../'), 'g'), '<projectRootDir>')
// }

// function relativeizePathInTree(tree) {
//   tree.path = relativeizePath(tree.path)
//   if (tree.children) {
//     tree.children.forEach(relativeizePathInTree)
//   }
// }
