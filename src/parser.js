import path from 'path'
import findUp from 'find-up'
import yargs from 'yargs'
import {oneLine} from 'common-tags'
import arrify from 'arrify'
import camelcaseKeys from 'camelcase-keys'
import chalk from 'chalk'
import boolify from 'boolify'

const parser = yargs
  .usage('Usage: $0 <globs>... [--option-1 option-1-value --option-2]')
  .help('h')
  .alias('h', 'help')
  .version()
  .options({
    write: {
      default: false,
      describe: 'Edit the file in-place (beware!)',
      type: 'boolean',
    },
    stdin: {default: false, describe: 'Read input via stdin', type: 'boolean'},
    'eslint-ignore': {
      default: true,
      type: 'boolean',
      describe: oneLine`
        Only format matching files even if
        they are not ignored by .eslintignore.
        (can use --no-eslint-ignore to disable this)
      `,
    },
    eslintPath: {
      default: getPathInHostNodeModules('eslint'),
      describe: 'The path to the eslint module to use',
      coerce: coercePath,
    },
    prettierPath: {
      describe: 'The path to the prettier module to use',
      default: getPathInHostNodeModules('prettier'),
      coerce: coercePath,
    },
    ignore: {
      describe: oneLine`
          pattern(s) you wish to ignore
          (can be used multiple times
          and includes **/node_modules/** automatically)
        `,
      coerce: arrify,
    },
    'log-level': {
      describe: 'The log level to use',
      choices: ['silent', 'error', 'warn', 'info', 'debug', 'trace'],
      alias: 'l',
      default: 'warn',
    },
    'prettier-last': {
      describe: 'Run prettier last',
      default: false,
      type: 'boolean',
    },
    prettier: {
      describe: oneLine`
          Prettier configuration options 
          to be passed to prettier-eslint
          using dot-notation`,
    },
    // TODO: if we allow people to to specify a config path,
    // we need to read that somehow. These can come invarious
    // formats and we'd have to work out `extends` somehow as well.
    // I don't know whether ESLint exposes a way to do this...
    // Contributions welcome!
    // eslintConfigPath: {
    //   describe: 'Path to the eslint config to use for eslint --fix',
    // },
  })
  .coerce('prettier', config => {
    if (typeof config === 'object') {
      return boolify(camelcaseKeys(config))
    } else {
      throw Error(
        chalk.red(
          oneLine`You should use dot-notation with 
          the --prettier flag, for example, --prettier.singleQuote`,
        ),
      )
    }
  })
  .strict()

export default parser

function getPathInHostNodeModules(module) {
  const modulePath = findUp.sync(`node_modules/${module}`)

  if (modulePath) {
    return modulePath
  }

  return findUp.sync(`node_modules/${module}`, {cwd: __dirname})
}

function coercePath(input) {
  return path.isAbsolute(input) ? input : path.join(process.cwd(), input)
}
