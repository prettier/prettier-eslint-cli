const npsUtils = require("nps-utils");

const series = npsUtils.series;
const concurrent = npsUtils.concurrent;
const rimraf = npsUtils.rimraf;
const crossEnv = npsUtils.crossEnv;

module.exports = {
  scripts: {
    contributors: {
      add: {
        description: "When new people contribute to the project, run this",
        script: "all-contributors add",
      },
      generate: {
        description: "Update the badge and contributors table",
        script: "all-contributors generate",
      },
    },
    test: {
      default: crossEnv("NODE_ENV=test jest --coverage"),
      update: crossEnv("NODE_ENV=test jest --coverage --updateSnapshot"),
      watch: crossEnv("NODE_ENV=test jest --watch"),
      openCoverage: "open coverage/lcov-report/index.html",
      cli: {
        default: crossEnv(
          "NODE_ENV=test jest --config cli-test/jest.config.json"
        ),
        update: crossEnv(
          "NODE_ENV=test jest --config cli-test/jest.config.json --coverage --updateSnapshot"
        ),
        watch: crossEnv(
          "NODE_ENV=test jest --config cli-test/jest.config.json --watch"
        ),
      },
    },
    build: {
      description: "delete the dist directory and run babel to build the files",
      script: series(
        rimraf("dist"),
        "babel --copy-files --out-dir dist --ignore *.test.js,__mocks__ src"
      ),
    },
    lint: {
      description: "lint the entire project",
      script: "eslint . --cache",
    },
    validate: {
      description:
        "This runs several scripts to make sure things look good before committing or on clean install",
      script: concurrent.nps("lint", "build", "test", "test.cli"),
    },
    format: {
      description: "Formats everything with prettier-eslint",
      script: 'prettier-eslint "src/**/*.js" --write',
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
