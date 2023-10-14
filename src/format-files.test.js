/* eslint no-console:0 */
import fsMock from 'fs';
import findUpMock from 'find-up';
import { glob as globMock } from 'glob';
import mockGetStdin from 'get-stdin';
import getLogger from 'loglevel-colored-level-prefix';
import formatMock from './prettier-eslint';
import formatFiles from './format-files';

jest.mock('fs');

beforeEach(() => {
  process.stdout.write = jest.fn();
  console.error = jest.fn();
  console.log = jest.fn();
  formatMock.mockClear();
  fsMock.writeFile.mockClear();
  fsMock.readFile.mockClear();
});

afterEach(() => {
  process.exitCode = 0;
});

test('sanity test', async () => {
  const globs = ['src/**/1*.js', 'src/**/2*.js'];
  await formatFiles({ _: globs });
  expect(globMock).toHaveBeenCalledTimes(globs.length);
  expect(fsMock.readFile).toHaveBeenCalledTimes(6);
  expect(formatMock).toHaveBeenCalledTimes(6);
  expect(fsMock.writeFile).toHaveBeenCalledTimes(0);
  expect(process.stdout.write).toHaveBeenCalledTimes(6);
  expect(console.error).toHaveBeenCalledTimes(1);
  const mockOutput = expect.stringMatching(/MOCK_OUTPUT.*index.js/);
  const successOutput = expect.stringMatching(/success.*6.*files/);
  expect(process.stdout.write).toHaveBeenCalledWith(mockOutput);
  expect(console.error).toHaveBeenCalledWith(successOutput);
});

test('glob call inclues an ignore of node_modules', async () => {
  const fileGlob = 'src/**/1*.js';
  await formatFiles({ _: [fileGlob] });
  const globOptions = expect.objectContaining({
    ignore: expect.arrayContaining(['**/node_modules/**'])
  });
  expect(globMock).toHaveBeenCalledWith(fileGlob, globOptions);
});

test('glob call excludes an ignore of node_modules', async () => {
  const fileGlob = 'foo/node_modules/stuff*.js';
  await formatFiles({ _: [fileGlob] });
  expect(globMock).not.toHaveBeenCalledWith(
    expect.any,
    expect.objectContaining({
      // should not have an ignore with **/node_modules/**
      ignore: expect.arrayContaining(['**/node_modules/**'])
    })
  );
});

test('should accept stdin', async () => {
  mockGetStdin.stdin = '  var [ foo, {  bar } ] = window.APP ;';
  await formatFiles({ stdin: true });
  expect(formatMock).toHaveBeenCalledTimes(1);
  // the trim is part of the test
  const text = mockGetStdin.stdin.trim();
  expect(formatMock).toHaveBeenCalledWith(expect.objectContaining({ text }));
  expect(process.stdout.write).toHaveBeenCalledTimes(1);
  expect(process.stdout.write).toHaveBeenCalledWith('MOCK_OUTPUT for stdin');
});

test('will write to files if that is specified', async () => {
  const fileGlob = 'src/**/1*.js';
  await formatFiles({ _: [fileGlob], write: true });
  expect(fsMock.writeFile).toHaveBeenCalledTimes(4);
});

test('handles stdin errors gracefully', async () => {
  mockGetStdin.stdin = 'MOCK_SYNTAX_ERROR';
  await formatFiles({ stdin: true });
  expect(console.error).toHaveBeenCalledTimes(1);
});

test('handles file errors gracefully', async () => {
  const globs = ['files-with-syntax-errors/*.js', 'src/**/1*.js'];
  await formatFiles({ _: globs, write: true });
  expect(fsMock.writeFile).toHaveBeenCalledTimes(4);
  expect(console.error).toHaveBeenCalledTimes(4);
  const successOutput = expect.stringMatching(/success.*4.*files/);
  const failureOutput = expect.stringMatching(/failure.*2.*files/);
  expect(console.error).toHaveBeenCalledWith(successOutput);
  expect(console.error).toHaveBeenCalledWith(failureOutput);
});

test('does not print success if there were no successful files', async () => {
  await formatFiles({ _: ['no-match/*.js'] });
  const successOutput = expect.stringMatching(/unhandled error/);
  expect(process.stdout.write).not.toHaveBeenCalledWith(successOutput);
});

test('fails gracefully if something odd happens', async () => {
  await formatFiles({ _: ['throw-error/*.js'] });
  expect(console.error).toHaveBeenCalledTimes(1);
  const label = expect.stringMatching(/prettier-eslint-cli/);
  const notice = expect.stringMatching(/unhandled error/);
  const errorStack = expect.stringMatching(/something weird happened/);
  expect(console.error).toHaveBeenCalledWith(label, notice, errorStack);
});

test('logs errors to the console if something goes wrong', async () => {
  const globs = ['eslint-config-error/*.js', 'src/**/2*.js'];
  await formatFiles({ _: globs, write: true });
  expect(fsMock.writeFile).toHaveBeenCalledTimes(4);
  expect(console.error).toHaveBeenCalledTimes(4);
  const successOutput = expect.stringMatching(/success.*4.*files/);
  const failureOutput = expect.stringMatching(/failure.*2.*files/);
  expect(console.error).toHaveBeenCalledWith(successOutput);
  expect(console.error).toHaveBeenCalledWith(failureOutput);
  const errorPrefix = expect.stringMatching(/prettier-eslint-cli.*ERROR/);
  const cliError = expect.stringContaining('eslint-config-error');
  const errorOutput = expect.stringContaining('Some weird eslint config error');
  expect(console.error).toHaveBeenCalledWith(
    errorPrefix,
    cliError,
    errorOutput
  );
});

test('does not log anything to the console if logLevel is silent', async () => {
  const log = getLogger();
  const globs = ['eslint-config-error/*.js', 'src/**/2*.js'];
  await formatFiles({
    _: globs,
    write: true,
    logLevel: log.levels.SILENT
  });
  expect(fsMock.writeFile).toHaveBeenCalledTimes(4);
  expect(console.error).not.toHaveBeenCalled();
});

test('forwards logLevel onto prettier-eslint', async () => {
  await formatFiles({ _: ['src/**/1*.js'], logLevel: 'debug' });
  const options = expect.objectContaining({ logLevel: 'debug' });
  expect(formatMock).toHaveBeenCalledWith(options);
});

test('forwards prettierLast onto prettier-eslint', async () => {
  await formatFiles({ _: ['src/**/1*.js'], prettierLast: true });
  expect(formatMock).toHaveBeenCalledWith(
    expect.objectContaining({ prettierLast: true })
  );
});

test('forwards prettierOptions onto prettier-eslint', async () => {
  await formatFiles({
    _: ['src/**/1*.js'],
    trailingComma: 'es5'
  });
  expect(formatMock).toHaveBeenCalledWith(
    expect.objectContaining({ prettierOptions: { trailingComma: 'es5' } })
  );
});

test('wont save file if contents did not change', async () => {
  const fileGlob = 'no-change/*.js';
  await formatFiles({ _: [fileGlob], write: true });
  expect(fsMock.readFile).toHaveBeenCalledTimes(3);
  expect(fsMock.writeFile).toHaveBeenCalledTimes(0);
  const unchangedOutput = expect.stringMatching(/3.*?files.*?unchanged/);
  expect(console.error).toHaveBeenCalledWith(unchangedOutput);
});

test('will report unchanged files even if not written', async () => {
  const fileGlob = 'no-change/*.js';
  await formatFiles({ _: [fileGlob], write: false });
  expect(fsMock.readFile).toHaveBeenCalledTimes(3);
  expect(fsMock.writeFile).toHaveBeenCalledTimes(0);
  const unchangedOutput = expect.stringMatching(/3.*?files.*?unchanged/);
  expect(console.error).toHaveBeenCalledWith(unchangedOutput);
});

test('allows you to specify an ignore glob', async () => {
  const ignore = ['src/ignore/thing', 'src/ignore/otherthing'];
  const fileGlob = 'src/**/1*.js';
  await formatFiles({ _: [fileGlob], ignore });

  const globOptions = expect.objectContaining({
    ignore: [...ignore, '**/node_modules/**']
  });
  expect(globMock).toHaveBeenCalledWith(fileGlob, globOptions);
});

test('wont modify a file if it is eslint ignored', async () => {
  await formatFiles({ _: ['src/**/eslintignored*.js'], write: true });
  expect(fsMock.readFile).toHaveBeenCalledTimes(1);
  expect(fsMock.writeFile).toHaveBeenCalledTimes(1);
  expect(fsMock.readFile).toHaveBeenCalledWith(
    expect.stringMatching(/applied/),
    'utf8',
    expect.any(Function)
  );
  expect(fsMock.writeFile).toHaveBeenCalledWith(
    expect.stringMatching(/applied/),
    expect.stringMatching(/MOCK_OUTPUT.*?applied/),
    expect.any(Function)
  );
  const ignoredOutput = expect.stringMatching(/success.*1.*file/);
  expect(console.error).toHaveBeenCalledWith(ignoredOutput);
});

test('will modify a file if it is eslint ignored with noIgnore', async () => {
  await formatFiles({
    _: ['src/**/eslintignored*.js'],
    write: true,
    eslintIgnore: false
  });
  expect(fsMock.readFile).toHaveBeenCalledTimes(4);
  expect(fsMock.writeFile).toHaveBeenCalledTimes(4);
  const ignoredOutput = expect.stringMatching(/success.*4.*files/);
  expect(console.error).toHaveBeenCalledWith(ignoredOutput);
});

test('wont modify a file if it is prettier ignored', async () => {
  await formatFiles({ _: ['src/**/prettierignored*.js'], write: true });
  expect(fsMock.readFile).toHaveBeenCalledTimes(1);
  expect(fsMock.writeFile).toHaveBeenCalledTimes(1);
  expect(fsMock.readFile).toHaveBeenCalledWith(
    expect.stringMatching(/applied/),
    'utf8',
    expect.any(Function)
  );
  expect(fsMock.writeFile).toHaveBeenCalledWith(
    expect.stringMatching(/applied/),
    expect.stringMatching(/MOCK_OUTPUT.*?applied/),
    expect.any(Function)
  );
  const ignoredOutput = expect.stringMatching(/success.*1.*file/);
  expect(console.error).toHaveBeenCalledWith(ignoredOutput);
});

test('will modify a file if it is prettier ignored with noIgnore', async () => {
  await formatFiles({
    _: ['src/**/prettierignored*.js'],
    write: true,
    prettierIgnore: false
  });
  expect(fsMock.readFile).toHaveBeenCalledTimes(4);
  expect(fsMock.writeFile).toHaveBeenCalledTimes(4);
  const ignoredOutput = expect.stringMatching(/success.*4.*files/);
  expect(console.error).toHaveBeenCalledWith(ignoredOutput);
});

test('will not blow up if an .eslintignore or .prettierignore cannot be found', async () => {
  const originalSync = findUpMock.sync;
  findUpMock.sync = () => null;
  try {
    await formatFiles({
      _: ['src/**/no-ignore/*.js'],
      write: true
    });
  } finally {
    findUpMock.sync = originalSync;
  }
});

describe('listDifferent', () => {
  test('will list different files', async () => {
    await formatFiles({
      _: ['src/**/1*.js', 'src/**/no-change*.js'],
      listDifferent: true
    });
    expect(fsMock.readFile).toHaveBeenCalledTimes(7);
    expect(fsMock.writeFile).toHaveBeenCalledTimes(0);

    const path =
      '/Users/fredFlintstone/Developer/top-secret/footless-carriage/';
    expect(console.log).toHaveBeenCalledTimes(4);
    expect(console.log).toHaveBeenCalledWith(`${path}stop/log.js`);
    expect(console.log).toHaveBeenCalledWith(`${path}stop/index.js`);
    expect(console.log).toHaveBeenCalledWith(`${path}index.js`);
    expect(console.log).toHaveBeenCalledWith(`${path}start.js`);
  });

  test('will error out when contents did change', async () => {
    const fileGlob = 'src/**/1*.js';
    await formatFiles({
      _: [fileGlob],
      listDifferent: true
    });
    expect(process.exitCode).toBe(1);
  });

  test('wont error out when contents did not change', async () => {
    const fileGlob = 'no-change/*.js';
    await formatFiles({
      _: [fileGlob],
      listDifferent: true
    });
    expect(process.exitCode).toBe(0);
  });
});

describe('eslintConfigPath', () => {
  test('will use eslintrc', async () => {
    await formatFiles({
      _: ['src/**/1*.js'],
      eslintConfigPath: '.eslintrc'
    });
    expect(process.exitCode).toBe(0);
  });
});
