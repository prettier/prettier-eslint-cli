import yargs from 'yargs'

const parser = yargs
  .usage('Usage: $0')
  .help('h')
  .alias('h', 'help')

export default parser
