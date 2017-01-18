import yargs from 'yargs'

const parser = yargs
  .usage('Usage: $0 <globs>...')
  .help('h')
  .alias('h', 'help')
  .version()
  .options({
    log: {
      alias: 'l',
      value: false,
      describe: 'Show logs',
    },
  })

export default parser
