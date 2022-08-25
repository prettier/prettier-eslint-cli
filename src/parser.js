import path from 'path';
import yargs from 'yargs';
import { oneLine, stripIndent } from 'common-tags';
import arrify from 'arrify';

const parser = yargs
  .usage(
    stripIndent`
      Usage: $0 <globs>... [--option-1 option-1-value --option-2]

      Prefix an option with "no-" to set it to false, such as --no-semi to
      disable semicolons and --no-eslint-ignore to disable default ignores.
    `
  )
  .help('h')
  .alias('h', 'help')
  .version()
  .options({
    write: {
      default: false,
      describe: 'Edit the file in-place (beware!)',
      type: 'boolean'
    },
    stdin: {
      default: false,
      describe: 'Read input via stdin',
      type: 'boolean'
    },
    'stdin-filepath': {
      describe: 'Path to the file to pretend that stdin comes from.',
      coerce: coercePath
    },
    'eslint-ignore': {
      default: true,
      type: 'boolean',
      describe: oneLine`
        Only format matching files even if
        they are not ignored by .eslintignore.
        (can use --no-eslint-ignore to disable this)
      `
    },
    'prettier-ignore': {
      default: true,
      type: 'boolean',
      describe: oneLine`
        Only format matching files even if
        they are not ignored by .prettierignore.
        (can use --no-prettier-ignore to disable this)
      `
    },
    'list-different': {
      default: false,
      type: 'boolean',
      describe: oneLine`
        Print filenames of files that are different
        from Prettier + Eslint formatting.
      `
    },
    includeDotFiles: {
      default: false,
      type: 'boolean',
      describe: oneLine`
        Include files that start with a dot in the search.
      `
    },
    // allow `--eslint-path` and `--eslintPath`
    'eslint-path': {
      describe: 'The path to the eslint module to use',
      coerce: coercePath
    },
    // allow `--eslint-config-path` and `--eslintConfigPath`
    'eslint-config-path': {
      default: undefined,
      describe: 'Path to the eslint config to use for eslint --fix'
    },
    // allow `--prettier-path` and `--prettierPath`
    'prettier-path': {
      describe: 'The path to the prettier module to use',
      coerce: coercePath
    },
    config: {
      default: undefined,
      describe: 'Path to the prettier config'
    },
    ignore: {
      describe: oneLine`
        pattern(s) you wish to ignore
        (can be used multiple times
        and includes **/node_modules/** automatically)
      `,
      coerce: arrify
    },
    'log-level': {
      describe: 'The log level to use',
      choices: ['silent', 'error', 'warn', 'info', 'debug', 'trace'],
      alias: 'l',
      default: process.env.LOG_LEVEL || 'warn'
    },
    'prettier-last': {
      describe: 'Run prettier last',
      default: false,
      type: 'boolean'
    },
    'use-tabs': {
      type: 'boolean',
      default: undefined,
      describe: 'Indent lines with tabs instead of spaces.'
    },
    'print-width': {
      type: 'number',
      describe: 'Specify the length of line that the printer will wrap on.'
    },
    'tab-width': {
      type: 'number',
      describe: 'Specify the number of spaces per indentation-level.'
    },
    'trailing-comma': {
      type: 'string',
      describe: stripIndent`
        Print trailing commas wherever possible.

        Valid options:
          - "none" - no trailing commas
          - "es5" - trailing commas where valid in ES5 (objects, arrays, etc)
          - "all" - trailing commas wherever possible (function arguments)
      `,
      choices: ['none', 'es5', 'all']
    },
    'bracket-spacing': {
      type: 'boolean',
      default: undefined,
      describe: stripIndent`
        Print spaces between brackets in object literals.
        Can use --no-bracket-spacing for "false" to disable it.

        Valid options:
        - true - Example: { foo: bar }
        - false - Example: {foo: bar}
      `
    },
    'jsx-bracket-same-line': {
      type: 'boolean',
      describe: oneLine`
        Put the > of a multi-line JSX element at
        the end of the last line instead of
        being alone on the next line
      `
    },
    parser: {
      type: 'string',
      describe: 'Specify which parser to use.'
    },
    semi: {
      type: 'boolean',
      default: undefined,
      describe: stripIndent`
        Print semicolons at the ends of statements.
        Can use --no-semi.

        Valid options:
          - true - add a semicolon at the end of every statement
          - false - ${oneLine`
            only add semicolons at the beginning of lines
            that may introduce ASI failures
          `}
      `
    },
    'single-quote': {
      type: 'boolean',
      default: undefined,
      describe: 'Use single quotes instead of double quotes.'
    },
    'arrow-parens': {
      type: 'string',
      default: undefined,
      describe: stripIndent`
        Include parentheses around a sole arrow function parameter.

        Valid options:
        - "avoid" - Omit parens when possible. Example: x => x
        - "always" - Always include parens. Example: (x) => x
      `
    },
    'require-pragma': {
      type: 'boolean',
      default: undefined,
      describe: stripIndent`
        Prettier can restrict itself to only format files
        that contain a special comment, called a pragma,
        at the top of the file.
        This is very useful when gradually transitioning
        large, unformatted codebases to prettier.
      `
    },
    'insert-pragma': {
      type: 'boolean',
      default: undefined,
      describe: stripIndent`
        Prettier can insert a special @format marker at the
        top of files specifying that the file has been
        formatted with prettier. This works well when used in
        tandem with the --require-pragma option.
        If there is already a docblock at the top of the file
        then this option will add a newline to it with the
        @format marker.
      `
    },
    'prose-wrap': {
      type: 'boolean',
      default: undefined,
      describe: stripIndent`
      By default, Prettier will wrap markdown text as-is
      since some services use a linebreak-sensitive
      renderer, e.g. GitHub comment and BitBucket.
      In some cases you may want to rely on
      editor/viewer soft wrapping instead, so this
      option allows you to opt out with "never".

      Valid options:

      "always" - Wrap prose if it exceeds the print width.
      "never" - Do not wrap prose.
      "preserve" - Wrap prose as-is. available in v1.9.0+
      `
    }
    // TODO: support range-start and range-end
    // would require changes in prettier-eslint
  })
  .strict();

export default parser;

function coercePath(input) {
  return path.isAbsolute(input) ? input : path.join(process.cwd(), input);
}
