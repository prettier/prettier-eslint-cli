# prettier-eslint-cli

CLI for [`prettier-eslint`][prettier-eslint]

[![Build Status][build-badge]][build]
[![Code Coverage][coverage-badge]][coverage]
[![version][version-badge]][package]
[![downloads][downloads-badge]][npm-stat]
[![MIT License][license-badge]][license]

[![All Contributors](https://img.shields.io/badge/all_contributors-21-orange.svg?style=flat-square)](#contributors)
[![PRs Welcome][prs-badge]][prs]
[![Donate][donate-badge]][donate]
[![Code of Conduct][coc-badge]][coc]
[![Roadmap][roadmap-badge]][roadmap]
[![Examples][examples-badge]][examples]

[![Watch on GitHub][github-watch-badge]][github-watch]
[![Star on GitHub][github-star-badge]][github-star]
[![Tweet][twitter-badge]][twitter]

<a href="https://app.codesponsor.io/link/PKGFLnhDiFvsUA5P4kAXfiPs/prettier/prettier-eslint-cli" rel="nofollow"><img src="https://app.codesponsor.io/embed/PKGFLnhDiFvsUA5P4kAXfiPs/prettier/prettier-eslint-cli.svg" style="width: 888px; height: 68px;" alt="Sponsor" /></a>

## The problem

You have a bunch of files that you want to format using [`prettier-eslint`][prettier-eslint].
But `prettier-eslint` can only operate on strings.

## This solution

This is a [CLI](https://en.wikipedia.org/wiki/Command-line_interface) that allows you to use
`prettier-eslint` on one or multiple files. `prettier-eslint-cli` forwards on the `filePath`
and other relevant options to `prettier-eslint` which identifies the applicable `ESLint`
config for each file and uses that to determine the options for `prettier` and `eslint --fix`.

## Installation

This module is distributed via [npm][npm] which is bundled with [node][node] and should
be installed (with [`yarn`][yarn]) as one of your project's `devDependencies`:

```
yarn add --dev prettier-eslint-cli
```

> If you're still using the [`npm`][npm] client: `npm install --save-dev prettier-eslint-cli`

## Usage

Typically you'll use this in your [npm scripts][npm scripts] (or [package scripts][package scripts]):

```json
{
  "scripts": {
    "format": "prettier-eslint \"src/**/*.js\""
  }
}
```

This will format all `.js` files in the `src` directory. The argument you pass to the CLI
is a [glob][glob] and you can pass as many as you wish. You can also pass options.

### Vim

Vim users can add the following to their .vimrc:

```
autocmd FileType javascript set formatprg=prettier-eslint\ --stdin
```

This makes prettier-eslint-cli power the gq command for automatic formatting without any plugins. You can also add the following to your .vimrc to run prettier-eslint-cli when .js files are saved:

```
autocmd BufWritePre *.js :normal gggqG
```

### CLI Options

```
prettier-eslint --help
Usage: prettier-eslint <globs>... [--option-1 option-1-value --option-2]

Prefix an option with "no-" to set it to false, such as --no-semi to
disable semicolons and --no-eslint-ignore to disable default ignores.

Options:
  -h, --help               Show help                                   [boolean]
  --version                Show version number                         [boolean]
  --write                  Edit the file in-place (beware!)
                                                      [boolean] [default: false]
  --stdin                  Read input via stdin       [boolean] [default: false]
  --stdin-filepath         Path to the file to pretend that stdin comes from.
  --eslint-ignore          Only format matching files even if they are not
                           ignored by .eslintignore. (can use --no-eslint-ignore
                           to disable this)            [boolean] [default: true]
  --prettier-ignore        Only format matching files even if they are not
                           ignored by .prettierignore. (can use
                           --no-prettier-ignore to disable this)
                                                       [boolean] [default: true]
  --list-different         Print filenames of files that are different from
                           Prettier + Eslint formatting.
                                                      [boolean] [default: false]
  --eslint-path            The path to the eslint module to use
                 [default: "./node_modules/eslint"]
  --eslint-config-path     Path to the eslint config to use for eslint --fix
  --prettier-path          The path to the prettier module to use [default: "./node_modules/prettier"]
  --config                 Path to the prettier config
  --ignore                 pattern(s) you wish to ignore (can be used multiple
                           times and includes **/node_modules/** automatically)
  --log-level, -l          The log level to use
        [choices: "silent", "error", "warn", "info", "debug", "trace"] [default:
                                                                         "warn"]
  --prettier-last          Run prettier last          [boolean] [default: false]
  --use-tabs               Indent lines with tabs instead of spaces.   [boolean]
  --print-width            Specify the length of line that the printer will wrap
                           on.                                          [number]
  --tab-width              Specify the number of spaces per indentation-level.
                                                                        [number]
  --trailing-comma         Print trailing commas wherever possible.

                           Valid options:
                           - "none" - no trailing commas
                           - "es5" - trailing commas where valid in ES5
                           (objects, arrays, etc)
                           - "all" - trailing commas wherever possible (function
                           arguments)   [string] [choices: "none", "es5", "all"]
  --bracket-spacing        Print spaces between brackets in object literals.
                           Can use --no-bracket-spacing for "false" to disable
                           it.

                           Valid options:
                           - true - Example: { foo: bar }
                           - false - Example: {foo: bar}               [boolean]
  --jsx-bracket-same-line  Put the > of a multi-line JSX element at the end of
                           the last line instead of being alone on the next line
                                                                       [boolean]
  --parser                 Specify which parser to use.                 [string]
  --semi                   Print semicolons at the ends of statements.
                           Can use --no-semi.

                           Valid options:
                           - true - add a semicolon at the end of every
                           statement
                           - false - only add semicolons at the beginning of
                           lines that may introduce ASI failures       [boolean]
  --single-quote           Use single quotes instead of double quotes. [boolean]
```

#### <globs>

Any number of [globs][glob] you wish to use to match the files you wish to format. By default, `glob` will ignore
`**/node_modules/**` unless the glob you provide
includes the string `node_modules`.

#### --write

By default `prettier-eslint` will simply log the formatted version to the terminal. If you want to overwrite the file
itself (a common use-case) then add `--write`. You should quote your globs, otherwise your terminal will expand the glob before it gets to `prettier-eslint` (which can have unexpected results):

```json
{
  "scripts": {
    "format": "prettier-eslint --write \"src/**/*.js\""
  }
}
```

> **NOTE:** It is recommended that you keep your files under source control and committed
> before running `prettier-eslint --write` as it will overwrite your files!

#### --list-different

Instead of printing the formatted version of the files to the terminal, `prettier-eslint` will log the name of the files that are different from the expected formatting. This can be usefull when using `prettier-eslint` in a version control system hook to inform the committer which files need to be formatted.

#### --stdin

Accept input via `stdin`. For example:

```
echo "var   foo =    'bar'" | prettier-eslint --stdin
# results in: "var foo = 'bar';" (depending on your eslint config)
```

#### --eslint-path

Forwarded as the `eslintPath` option to `prettier-eslint`

#### --eslint-config-path

Resolve eslint config file, parse and forward config object as the `eslintConfig` option to
`prettier-eslint`

#### --prettier-path

Forwarded as the `prettierPath` option to `prettier-eslint`

#### --log-level

Forwarded as `logLevel` option to `prettier-eslint`

#### --no-eslint-ignore

Disables application of `.eslintignore` to the files resolved from the glob. By
default, `prettier-eslint-cli` will exclude files if they are matched by a
`.eslintignore`. Add this flag to disable this behavior.

> Note: You can also set the `LOG_LEVEL` environment variable to control logging in `prettier-eslint`

#### --prettier-last

By default, `prettier-eslint-cli` will run `prettier` first, then `eslint --fix`. This is great if
you want to use `prettier`, but override some of the styles you don't like using `eslint --fix`.

An alternative approach is to use different tools for different concerns. If you provide the
argument `--prettier-last`, it will run `eslint --fix` first, then `prettier`. This allows you to
use `eslint` to look for bugs and/or bad practices, and use `prettier` to enforce code style.

#### `prettier` options

`prettier-eslint-cli` also supports the same command line options as `prettier`.

For example: `prettier-eslint --trailing-comma es5`

Refer to the [prettier-eslint](https://github.com/prettier/prettier#options) docs for documentation on these options

## Integration

Any linter that support ESLint [CLIEngine](http://eslint.org/docs/developer-guide/nodejs-api#cliengine) interface can be integrate with `prettier-eslint`

### Knowed integrated package helpers

- [standard-prettier-eslint][standard-prettier-eslint], a helper package for integrate [standard][standard]
- [semistandard-prettier-eslint][semistandard-prettier-eslint], a helper package for integrate [semistandard][semistandard]

### Standalone CLI tools based on `prettier-eslint-cli`

- [prettier-std-cli][prettier-std-cli] the easy to use CLI version of [standard-prettier-eslint][standard-prettier-eslint]
- [prettier-semi-cli][prettier-semi-cli] the easy to use CLI version of [semistandard-prettier-eslint][semistandard-prettier-eslint]

## Related

- [prettier-eslint](https://github.com/prettier/prettier-eslint) - the core package
- [prettier-eslint-atom](https://github.com/kentcdodds/prettier-eslint-atom) - an atom plugin

## Contributors

Thanks goes to these people ([emoji key][emojis]):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tr>
    <td align="center"><a href="https://kentcdodds.com"><img src="https://avatars.githubusercontent.com/u/1500684?v=3" width="100px;" alt=""/><br /><sub><b>Kent C. Dodds</b></sub></a><br /><a href="https://github.com/prettier/prettier-eslint-cli/commits?author=kentcdodds" title="Code">💻</a> <a href="https://github.com/prettier/prettier-eslint-cli/commits?author=kentcdodds" title="Documentation">📖</a> <a href="#infra-kentcdodds" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a> <a href="https://github.com/prettier/prettier-eslint-cli/commits?author=kentcdodds" title="Tests">⚠️</a></td>
    <td align="center"><a href="https://github.com/aharris88"><img src="https://avatars3.githubusercontent.com/u/3266363?v=3" width="100px;" alt=""/><br /><sub><b>Adam Harris</b></sub></a><br /><a href="https://github.com/prettier/prettier-eslint-cli/commits?author=aharris88" title="Code">💻</a> <a href="https://github.com/prettier/prettier-eslint-cli/commits?author=aharris88" title="Documentation">📖</a> <a href="https://github.com/prettier/prettier-eslint-cli/pulls?q=is%3Apr+reviewed-by%3Aaharris88" title="Reviewed Pull Requests">👀</a></td>
    <td align="center"><a href="https://ericmccormick.io"><img src="https://avatars.githubusercontent.com/u/622118?v=3" width="100px;" alt=""/><br /><sub><b>Eric McCormick</b></sub></a><br /><a href="https://github.com/prettier/prettier-eslint-cli/pulls?q=is%3Apr+reviewed-by%3Aedm00se" title="Reviewed Pull Requests">👀</a></td>
    <td align="center"><a href="https://github.com/joelseq"><img src="https://avatars.githubusercontent.com/u/12389411?v=3" width="100px;" alt=""/><br /><sub><b>Joel Sequeira</b></sub></a><br /><a href="https://github.com/prettier/prettier-eslint-cli/commits?author=joelseq" title="Documentation">📖</a></td>
    <td align="center"><a href="https://frank.taillandier.me"><img src="https://avatars.githubusercontent.com/u/103008?v=3" width="100px;" alt=""/><br /><sub><b>Frank Taillandier</b></sub></a><br /></td>
    <td align="center"><a href="http://sheerun.net"><img src="https://avatars3.githubusercontent.com/u/292365?v=3" width="100px;" alt=""/><br /><sub><b>Adam Stankiewicz</b></sub></a><br /><a href="https://github.com/prettier/prettier-eslint-cli/commits?author=sheerun" title="Code">💻</a></td>
    <td align="center"><a href="http://www.stephenjohnsorensen.com/"><img src="https://avatars3.githubusercontent.com/u/487068?v=3" width="100px;" alt=""/><br /><sub><b>Stephen John Sorensen</b></sub></a><br /><a href="https://github.com/prettier/prettier-eslint-cli/commits?author=spudly" title="Code">💻</a></td>
  </tr>
  <tr>
    <td align="center"><a href="https://github.com/Gandem"><img src="https://avatars0.githubusercontent.com/u/11560964?v=3" width="100px;" alt=""/><br /><sub><b>Gandem</b></sub></a><br /><a href="https://github.com/prettier/prettier-eslint-cli/commits?author=Gandem" title="Code">💻</a> <a href="https://github.com/prettier/prettier-eslint-cli/commits?author=Gandem" title="Tests">⚠️</a></td>
    <td align="center"><a href="https://github.com/cef62"><img src="https://avatars0.githubusercontent.com/u/129991?v=3" width="100px;" alt=""/><br /><sub><b>Matteo Ronchi</b></sub></a><br /><a href="https://github.com/prettier/prettier-eslint-cli/issues?q=author%3Acef62" title="Bug reports">🐛</a> <a href="https://github.com/prettier/prettier-eslint-cli/commits?author=cef62" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/BenoitZugmeyer"><img src="https://avatars2.githubusercontent.com/u/61787?v=3" width="100px;" alt=""/><br /><sub><b>Benoît Zugmeyer</b></sub></a><br /><a href="https://github.com/prettier/prettier-eslint-cli/commits?author=BenoitZugmeyer" title="Code">💻</a> <a href="https://github.com/prettier/prettier-eslint-cli/commits?author=BenoitZugmeyer" title="Tests">⚠️</a></td>
    <td align="center"><a href="https://i.am.charlike.online"><img src="https://avatars0.githubusercontent.com/u/5038030?v=3" width="100px;" alt=""/><br /><sub><b>Charlike Mike Reagent</b></sub></a><br /><a href="https://github.com/prettier/prettier-eslint-cli/commits?author=tunnckoCore" title="Code">💻</a> <a href="https://github.com/prettier/prettier-eslint-cli/commits?author=tunnckoCore" title="Tests">⚠️</a></td>
    <td align="center"><a href="https://github.com/diondirza"><img src="https://avatars0.githubusercontent.com/u/10954870?v=3" width="100px;" alt=""/><br /><sub><b>Dion Dirza</b></sub></a><br /><a href="https://github.com/prettier/prettier-eslint-cli/issues?q=author%3Adiondirza" title="Bug reports">🐛</a></td>
    <td align="center"><a href="https://github.com/mrm007"><img src="https://avatars0.githubusercontent.com/u/3297808?v=3" width="100px;" alt=""/><br /><sub><b>mrm007</b></sub></a><br /><a href="https://github.com/prettier/prettier-eslint-cli/issues?q=author%3Amrm007" title="Bug reports">🐛</a> <a href="https://github.com/prettier/prettier-eslint-cli/commits?author=mrm007" title="Code">💻</a></td>
    <td align="center"><a href="http://www.jackfranklin.co.uk"><img src="https://avatars0.githubusercontent.com/u/193238?v=3" width="100px;" alt=""/><br /><sub><b>Jack Franklin</b></sub></a><br /><a href="https://github.com/prettier/prettier-eslint-cli/commits?author=jackfranklin" title="Code">💻</a></td>
  </tr>
  <tr>
    <td align="center"><a href="http://www.ryanzim.com"><img src="https://avatars0.githubusercontent.com/u/17342435?v=3" width="100px;" alt=""/><br /><sub><b>Ryan Zimmerman</b></sub></a><br /><a href="https://github.com/prettier/prettier-eslint-cli/commits?author=RyanZim" title="Documentation">📖</a></td>
    <td align="center"><a href="http://stackoverflow.com/users/63011"><img src="https://avatars3.githubusercontent.com/u/1186409?v=3" width="100px;" alt=""/><br /><sub><b>Paolo Moretti</b></sub></a><br /><a href="https://github.com/prettier/prettier-eslint-cli/issues?q=author%3Amoretti" title="Bug reports">🐛</a> <a href="https://github.com/prettier/prettier-eslint-cli/commits?author=moretti" title="Code">💻</a> <a href="https://github.com/prettier/prettier-eslint-cli/commits?author=moretti" title="Tests">⚠️</a></td>
    <td align="center"><a href="https://github.com/bySabi"><img src="https://avatars0.githubusercontent.com/u/6242574?v=3" width="100px;" alt=""/><br /><sub><b>bySabi Files</b></sub></a><br /><a href="https://github.com/prettier/prettier-eslint-cli/commits?author=bySabi" title="Documentation">📖</a> <a href="#tool-bySabi" title="Tools">🔧</a></td>
    <td align="center"><a href="http://morhetz.com"><img src="https://avatars1.githubusercontent.com/u/554231?v=4" width="100px;" alt=""/><br /><sub><b>Pavel Pertsev</b></sub></a><br /><a href="https://github.com/prettier/prettier-eslint-cli/commits?author=morhetz" title="Code">💻</a> <a href="https://github.com/prettier/prettier-eslint-cli/commits?author=morhetz" title="Tests">⚠️</a></td>
    <td align="center"><a href="http://www.joshenglish.com"><img src="https://avatars3.githubusercontent.com/u/13577271?v=4" width="100px;" alt=""/><br /><sub><b>Josh English</b></sub></a><br /><a href="https://github.com/prettier/prettier-eslint-cli/commits?author=jmenglis" title="Tests">⚠️</a> <a href="https://github.com/prettier/prettier-eslint-cli/issues?q=author%3Ajmenglis" title="Bug reports">🐛</a> <a href="https://github.com/prettier/prettier-eslint-cli/commits?author=jmenglis" title="Code">💻</a> <a href="#plugin-jmenglis" title="Plugin/utility libraries">🔌</a></td>
    <td align="center"><a href="https://disquisition.net"><img src="https://avatars2.githubusercontent.com/u/1706502?v=4" width="100px;" alt=""/><br /><sub><b>Spenser Isdahl</b></sub></a><br /><a href="https://github.com/prettier/prettier-eslint-cli/commits?author=disquisition" title="Code">💻</a> <a href="https://github.com/prettier/prettier-eslint-cli/commits?author=disquisition" title="Documentation">📖</a> <a href="https://github.com/prettier/prettier-eslint-cli/commits?author=disquisition" title="Tests">⚠️</a></td>
    <td align="center"><a href="https://github.com/bj00rn"><img src="https://avatars0.githubusercontent.com/u/10961167?v=4" width="100px;" alt=""/><br /><sub><b>Björn Dalfors</b></sub></a><br /><a href="#infra-bj00rn" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a></td>
  </tr>
  <tr>
    <td align="center"><a href="https://github.com/sscaff1"><img src="https://avatars1.githubusercontent.com/u/1554424?v=4" width="100px;" alt=""/><br /><sub><b>Steven Scaffidi</b></sub></a><br /><a href="https://github.com/prettier/prettier-eslint-cli/commits?author=sscaff1" title="Documentation">📖</a></td>
    <td align="center"><a href="http://danielwilhelmsen.com"><img src="https://avatars3.githubusercontent.com/u/1758049?v=4" width="100px;" alt=""/><br /><sub><b>Daniel Wilhelmsen</b></sub></a><br /><a href="https://github.com/prettier/prettier-eslint-cli/commits?author=dpwilhelmsen" title="Code">💻</a> <a href="#maintenance-dpwilhelmsen" title="Maintenance">🚧</a></td>
  </tr>
</table>

<!-- markdownlint-enable -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors][all-contributors] specification. Contributions of any kind welcome!

## LICENSE

MIT

[yarn]: https://yarnpkg.com/
[npm]: https://www.npmjs.com/
[node]: https://nodejs.org
[build-badge]: https://img.shields.io/travis/prettier/prettier-eslint-cli.svg?style=flat-square
[build]: https://travis-ci.org/prettier/prettier-eslint-cli
[coverage-badge]: https://img.shields.io/codecov/c/github/prettier/prettier-eslint-cli.svg?style=flat-square
[coverage]: https://codecov.io/github/prettier/prettier-eslint-cli
[version-badge]: https://img.shields.io/npm/v/prettier-eslint-cli.svg?style=flat-square
[package]: https://www.npmjs.com/package/prettier-eslint-cli
[downloads-badge]: https://img.shields.io/npm/dm/prettier-eslint-cli.svg?style=flat-square
[npm-stat]: http://npm-stat.com/charts.html?package=prettier-eslint-cli&from=2016-04-01
[license-badge]: https://img.shields.io/npm/l/prettier-eslint-cli.svg?style=flat-square
[license]: https://github.com/prettier/prettier-eslint-cli/blob/master/other/LICENSE
[prs-badge]: https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square
[prs]: http://makeapullrequest.com
[donate-badge]: https://img.shields.io/badge/$-support-green.svg?style=flat-square
[donate]: https://www.paypal.me/zimme
[coc-badge]: https://img.shields.io/badge/code%20of-conduct-ff69b4.svg?style=flat-square
[coc]: https://github.com/prettier/prettier-eslint-cli/blob/master/other/CODE_OF_CONDUCT.md
[roadmap-badge]: https://img.shields.io/badge/%F0%9F%93%94-roadmap-CD9523.svg?style=flat-square
[roadmap]: https://github.com/prettier/prettier-eslint-cli/blob/master/other/ROADMAP.md
[examples-badge]: https://img.shields.io/badge/%F0%9F%92%A1-examples-8C8E93.svg?style=flat-square
[examples]: https://github.com/prettier/prettier-eslint-cli/blob/master/other/EXAMPLES.md
[github-watch-badge]: https://img.shields.io/github/watchers/prettier/prettier-eslint-cli.svg?style=social
[github-watch]: https://github.com/prettier/prettier-eslint-cli/watchers
[github-star-badge]: https://img.shields.io/github/stars/prettier/prettier-eslint-cli.svg?style=social
[github-star]: https://github.com/prettier/prettier-eslint-cli/stargazers
[twitter]: https://twitter.com/intent/tweet?text=Check%20out%20prettier-eslint-cli!%20https://github.com/prettier/prettier-eslint-cli%20%F0%9F%91%8D
[twitter-badge]: https://img.shields.io/twitter/url/https/github.com/prettier/prettier-eslint-cli.svg?style=social
[emojis]: https://github.com/kentcdodds/all-contributors#emoji-key
[all-contributors]: https://github.com/kentcdodds/all-contributors
[prettier-eslint]: https://github.com/prettier/prettier-eslint
[npm scripts]: https://docs.npmjs.com/misc/scripts
[package scripts]: https://github.com/kentcdodds/p-s
[glob]: https://github.com/isaacs/node-glob
[standard-prettier-eslint]: https://github.com/bySabi/standard-prettier-eslint
[semistandard-prettier-eslint]: https://github.com/bySabi/semistandard-prettier-eslint
[standard]: https://github.com/standard/standard
[semistandard]: https://github.com/Flet/semistandard
[prettier-std-cli]: https://github.com/bySabi/prettier-std-cli
[prettier-semi-cli]: https://github.com/bySabi/prettier-semi-cli
