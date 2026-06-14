// @ts-check

/**
 * @import { Config } from 'jest';
 */

/**
 * @type {Config}
 */
const config = {
  transform: {
    '^.+\\.ts$': '@swc/jest',
  },
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  // TODO: test all the files...
  // collectCoverageFrom: ['src/**/*.ts'],
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

export default config;
