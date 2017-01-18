import path from 'path'
import findUp from 'find-up'
import yargs from 'yargs'

const parser = yargs
  .usage('Usage: $0 <globs>...')
  .help('h')
  .alias('h', 'help')
  .version()
  .options({
    log: {
      default: false,
      describe: 'Show logs',
    },
    eslintPath: {
      default: getPathInHostNodeModules('eslint'),
      describe: 'The path to the eslint module to use',
    },
    prettierPath: {
      default: getPathInHostNodeModules('prettier'),
      describe: 'The path to the prettier module to use',
    },
  })

export default parser

function getPathInHostNodeModules(module) {
  const modulePath = findUp.sync(`node_modules/${module}`)
  if (modulePath) {
    return modulePath
  } else {
    return path.relative(__dirname, `../node_modules/${module}`)
  }
}
