const npsUtils = require('nps-utils');

const series = npsUtils.series;
const concurrent = npsUtils.concurrent;
const rimraf = npsUtils.rimraf;
const crossEnv = npsUtils.crossEnv;

const nodeCommand = process.features.typescript
  ? 'node'
  : 'node --import @oxc-node/core/register';

module.exports = {
  scripts: {
    contributors: {
      add: {
        description: 'When new people contribute to the project, run this',
        script: 'all-contributors add',
      },
      generate: {
        description: 'Update the badge and contributors table',
        script: 'all-contributors generate',
      },
    },
    test: {
      default: crossEnv('NODE_ENV=test vitest run --coverage'),
      update: crossEnv('NODE_ENV=test vitest run --coverage --update'),
      watch: crossEnv('NODE_ENV=test vitest'),
      openCoverage: 'open coverage/index.html',
      cli: {
        default: crossEnv('NODE_ENV=test vitest run test/tests'),
        update: crossEnv(
          'NODE_ENV=test vitest run test/tests --coverage --update'
        ),
        watch: crossEnv('NODE_ENV=test vitest test/tests'),
      },
    },
    build: {
      description:
        'delete the dist directory and compile the files with TypeScript',
      script: series(rimraf('dist'), 'tsc -p tsconfig.build.json'),
    },
    lint: {
      description: 'lint the entire project',
      script: 'eslint . --cache',
    },
    validate: {
      description:
        'This runs several scripts to make sure things look good before committing or on clean install',
      script: concurrent.nps('lint', 'build', 'test'),
    },
    format: {
      description: 'Formats everything with prettier-eslint',
      script: `${nodeCommand} src/index.ts --write "**/*.{cjs,js,json,md,ts,yml}"`,
    },
  },
  options: {
    silent: false,
  },
};

// this is not transpiled
/*
  eslint
  max-len: 0,
  comma-dangle: [
    2,
    {
      arrays: 'always-multiline',
      objects: 'always-multiline',
      functions: 'never'
    }
  ]
 */
