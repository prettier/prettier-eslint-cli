// @ts-check

/**
 * @type {Config}
 * @import { Config } from 'jest'
 */
module.exports = {
  testEnvironment: 'node',
  // TODO: test all the files...
  // collectCoverageFrom: ['src/**/*.js'],
  testPathIgnorePatterns: ['/node_modules/', '/fixtures/', '/dist/'],
  coveragePathIgnorePatterns: ['/node_modules/', '/fixtures/', '/dist/'],
  coverageThreshold: {
    global: {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
  },
};
