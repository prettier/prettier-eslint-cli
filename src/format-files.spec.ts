import mockFs from 'node:fs/promises';
import path from 'node:path';
import { text as mockText } from 'node:stream/consumers';

import { hfs } from '@humanfs/node';
import { ESLint } from 'eslint';
import { findUpSync } from 'find-up';
import getLogger from 'loglevel-colored-level-prefix';
import { vi, type Mocked } from 'vitest';

import { formatFiles, clearFormatFilesCaches } from './format-files.ts';
import { format as formatMock } from './prettier-eslint.ts';

const mockedFs = mockFs as Mocked<typeof mockFs>;
const mockedFormat = vi.mocked(formatMock);
const mockedText = vi.mocked(mockText);

vi.mock('node:fs/promises');

const { findConfigFileMock } = vi.hoisted(() => ({
  findConfigFileMock: vi.fn(),
}));

vi.mock('eslint', () => ({
  ESLint: vi.fn(function ESLintMock() {
    return { findConfigFile: findConfigFileMock };
  }),
}));

interface WalkEntry {
  isDirectory: boolean;
  path: string;
}

interface WalkOptions {
  directoryFilter?: (entry: WalkEntry) => Promise<boolean> | boolean;
  entryFilter?: (entry: WalkEntry) => Promise<boolean> | boolean;
}

// Mock walk entries: each entry object has isDirectory and path
let walkEntries: WalkEntry[] = [];

vi.mock('@humanfs/node', () => ({
  hfs: {
    isDirectory: vi.fn(async () => true),
    isFile: vi.fn(async () => false),
    walk: vi.fn((_bp: string, opts: WalkOptions) => {
      async function* gen() {
        for (const entry of walkEntries) {
          if (
            entry.isDirectory &&
            opts.directoryFilter &&
            !(await opts.directoryFilter(entry))
          ) {
            continue;
          }

          if (opts.entryFilter) {
            if (await opts.entryFilter(entry)) {
              yield entry;
            }
          } else {
            yield entry;
          }
        }
      }
      return gen();
    }),
  },
}));

vi.mock('find-up');

vi.mock('./prettier-eslint.ts', () => ({
  format: vi.fn(
    ({ text, filePath = '' }: { filePath?: string; text: string }) => {
      if (text === 'MOCK_SYNTAX_ERROR' || filePath.includes('syntax-error')) {
        throw new Error('Mock error for a syntax error');
      } else if (filePath.includes('no-change')) {
        return Promise.resolve(text);
      }
      return Promise.resolve(`MOCK_OUTPUT for ${filePath || 'stdin'}`);
    },
  ),
}));

vi.mock('node:stream/consumers', () => ({
  text: vi.fn(),
}));

function getFormattedFiles(): string[] {
  return mockedFormat.mock.calls.map(([options]) => {
    expect(options.filePath).toBeDefined();
    return path.relative(process.cwd(), options.filePath!);
  });
}

beforeEach(() => {
  clearFormatFilesCaches();
  process.stdout.write = vi.fn();
  process.stdin.isTTY = undefined as unknown as boolean;
  console.error = vi.fn();
  console.log = vi.fn();
  mockedFormat.mockClear();
  mockedFs.writeFile.mockClear();
  mockedFs.readFile.mockClear();
  mockedText.mockClear();
  vi.mocked(hfs.isDirectory).mockClear();
  vi.mocked(hfs.isFile).mockClear();
  vi.mocked(hfs.isFile).mockResolvedValue(false);
  vi.mocked(hfs.walk).mockClear();
  vi.mocked(findUpSync).mockImplementation(filename => `/${String(filename)}`);
  findConfigFileMock.mockReset();
  findConfigFileMock.mockResolvedValue(undefined);
  vi.mocked(ESLint).mockClear();
  walkEntries = [];
});

afterEach(() => {
  process.exitCode = 0;
});

test('walk is called for each glob pattern', async () => {
  walkEntries = [
    { isDirectory: false, path: 'a.js' },
    { isDirectory: false, path: 'b.js' },
  ];
  await formatFiles({ _: ['src/**/*.js', 'test/**/*.js'] });
  expect(hfs.walk).toHaveBeenCalledTimes(2);
  // 2 globs * 2 entries = 4 files + 1 .prettierignore read
  expect(mockFs.readFile).toHaveBeenCalledTimes(5);
});

test('non-matching entries are skipped', async () => {
  walkEntries = [
    { isDirectory: false, path: 'a.ts' },
    { isDirectory: false, path: 'b.js' },
  ];
  await formatFiles({ _: ['src/**/*.js'] });
  expect(getFormattedFiles()).toEqual(['src/b.js']);
});

test('directory entries are skipped', async () => {
  walkEntries = [
    { isDirectory: true, path: 'nested' },
    { isDirectory: false, path: 'nested/b.js' },
  ];
  await formatFiles({ _: ['src/**/*.js'] });
  expect(getFormattedFiles()).toEqual(['src/nested/b.js']);
});

test('missing glob base returns no files', async () => {
  vi.mocked(hfs.isDirectory).mockResolvedValueOnce(false);
  walkEntries = [{ isDirectory: false, path: 'b.js' }];
  await formatFiles({ _: ['src/**/*.js'] });
  expect(hfs.walk).not.toHaveBeenCalled();
  expect(getFormattedFiles()).toEqual([]);
});

test('missing glob base walk errors return no files', async () => {
  vi.mocked(hfs.walk).mockImplementationOnce(() => {
    throw Object.assign(new Error('walk failed'), { code: 'ENOENT' });
  });
  walkEntries = [{ isDirectory: false, path: 'b.js' }];
  await formatFiles({ _: ['src/**/*.js'] });
  expect(getFormattedFiles()).toEqual([]);
});

test('glob walk errors are reported', async () => {
  vi.mocked(hfs.walk).mockImplementationOnce(() => {
    throw new Error('walk failed');
  });
  walkEntries = [{ isDirectory: false, path: 'b.js' }];
  const result = await formatFiles({ _: ['src/**/*.js'] });
  expect(result).toMatchObject({ error: expect.any(Error) });
  expect(getFormattedFiles()).toEqual([]);
});

test('literal file targets are formatted without walking parent directory', async () => {
  vi.mocked(hfs.isFile).mockResolvedValueOnce(true);
  await formatFiles({ _: ['src/a.js'], prettierIgnore: false });
  expect(hfs.walk).not.toHaveBeenCalled();
  expect(getFormattedFiles()).toEqual(['src/a.js']);
});

test('literal file targets still apply ESLint ignores', async () => {
  vi.mocked(hfs.isFile).mockResolvedValueOnce(true);
  await formatFiles({ _: ['node_modules/pkg/a.js'], prettierIgnore: false });
  expect(hfs.walk).not.toHaveBeenCalled();
  expect(getFormattedFiles()).toEqual([]);
});

test('literal file targets still apply prettier ignores', async () => {
  vi.mocked(hfs.isFile).mockResolvedValueOnce(true);
  await formatFiles({ _: ['src/prettierignored.js'] });
  expect(hfs.walk).not.toHaveBeenCalled();
  expect(getFormattedFiles()).toEqual([]);
});

test('prettier ignore can be disabled', async () => {
  walkEntries = [{ isDirectory: false, path: 'prettierignored.js' }];
  await formatFiles({ _: ['src/**/*.js'], prettierIgnore: false });
  expect(getFormattedFiles()).toEqual(['src/prettierignored.js']);
});

test('prettier ignored status is cached', async () => {
  const ignorePath = path.join(process.cwd(), 'cache-src/prettier-cache-test');
  vi.mocked(findUpSync).mockReturnValue(ignorePath);
  mockedFs.readFile.mockResolvedValueOnce('');
  walkEntries = [
    { isDirectory: false, path: 'a.js' },
    { isDirectory: false, path: 'b.js' },
  ];
  await formatFiles({ _: ['cache-src/**/*.js'] });
  expect(
    mockedFs.readFile.mock.calls.filter(
      ([filePath]) => filePath === ignorePath,
    ),
  ).toHaveLength(1);
  expect(getFormattedFiles()).toEqual(['cache-src/a.js', 'cache-src/b.js']);
});

test('missing prettier ignore file formats files', async () => {
  vi.mocked(findUpSync).mockReturnValueOnce(undefined);
  walkEntries = [{ isDirectory: false, path: 'a.js' }];
  await formatFiles({ _: ['src/**/*.js'] });
  expect(getFormattedFiles()).toEqual(['src/a.js']);
});

test('eslint config preserves explicit null module exports', async () => {
  walkEntries = [
    { isDirectory: false, path: 'keep.js' },
    { isDirectory: false, path: 'other.js' },
  ];
  const result = await formatFiles({
    _: ['test/**/*.js'],
    eslintConfigPath: 'test/eslint-cjs-no-default.cjs',
  });
  expect(result).toMatchObject({ error: expect.any(Error) });
  expect(getFormattedFiles()).toEqual([]);
});

test('eslint config falls back to module exports when no default', async () => {
  walkEntries = [
    { isDirectory: false, path: 'keep.js' },
    { isDirectory: false, path: 'esm-named-ignored/skip.js' },
  ];
  await formatFiles({
    _: ['test/**/*.js'],
    eslintConfigPath: 'test/eslint-named-export-config.js',
  });
  expect(getFormattedFiles()).toEqual(['test/keep.js']);
});

test('eslint config preserves invalid array entries', async () => {
  walkEntries = [{ isDirectory: false, path: 'keep.js' }];
  const result = await formatFiles({
    _: ['test/**/*.js'],
    eslintConfigPath: 'test/eslint-null-entry-config.js',
  });
  expect(result).toMatchObject({ error: expect.any(Error) });
  expect(getFormattedFiles()).toEqual([]);
});

test('cli ignore globs still apply when eslint config ignores are disabled', async () => {
  walkEntries = [
    { isDirectory: false, path: 'keep.js' },
    { isDirectory: false, path: 'skip.js' },
  ];
  await formatFiles({
    _: ['src/**/*.js'],
    eslintIgnore: false,
    ignore: ['src/skip.js'],
  });
  expect(findConfigFileMock).not.toHaveBeenCalled();
  expect(getFormattedFiles()).toEqual(['src/keep.js']);
});

test('handles file formatting errors gracefully', async () => {
  walkEntries = [{ isDirectory: false, path: 'syntax-error.js' }];
  await formatFiles({ _: ['src/**/*.js'] });
  expect(console.error).toHaveBeenCalled();
  expect(process.exitCode).toBe(1);
});

test('prettier ignore globs are cached per ignore file', async () => {
  const ignorePath = path.join(process.cwd(), 'cache-ignore-file');
  vi.mocked(findUpSync).mockReturnValue(ignorePath);
  mockedFs.readFile.mockResolvedValueOnce('');
  walkEntries = [
    { isDirectory: false, path: 'one/a.js' },
    { isDirectory: false, path: 'two/b.js' },
  ];
  await formatFiles({ _: ['src/**/*.js'] });
  expect(mockedFs.readFile).toHaveBeenCalledWith(ignorePath, 'utf8');
  expect(
    mockedFs.readFile.mock.calls.filter(
      ([filePath]) => filePath === ignorePath,
    ),
  ).toHaveLength(1);
  expect(getFormattedFiles()).toEqual(['src/one/a.js', 'src/two/b.js']);

  mockedFormat.mockClear();
  mockedFs.readFile.mockClear();
  walkEntries = [{ isDirectory: false, path: 'three/c.js' }];
  await formatFiles({ _: ['src/**/*.js'] });
  expect(mockedFs.readFile).not.toHaveBeenCalledWith(ignorePath, 'utf8');
  expect(getFormattedFiles()).toEqual(['src/three/c.js']);
});

test('prettier ignored files are skipped before formatting', async () => {
  walkEntries = [{ isDirectory: false, path: 'prettierignored.js' }];
  await formatFiles({ _: ['src/**/*.js'] });
  expect(getFormattedFiles()).toEqual([]);
});

test('prettier ignore globs cache is reused', async () => {
  const ignorePath = path.join(process.cwd(), 'reused-ignore-file');
  vi.mocked(findUpSync).mockReturnValue(ignorePath);
  mockedFs.readFile.mockResolvedValueOnce('');
  walkEntries = [{ isDirectory: false, path: 'first.js' }];
  await formatFiles({ _: ['src/**/*.js'] });
  mockedFormat.mockClear();
  mockedFs.readFile.mockClear();
  walkEntries = [{ isDirectory: false, path: 'second.js' }];
  await formatFiles({ _: ['src/**/*.js'] });
  expect(mockedFs.readFile).not.toHaveBeenCalledWith(ignorePath, 'utf8');
  expect(getFormattedFiles()).toEqual(['src/second.js']);
});

test('eslint ignored directories are pruned by directory filter', async () => {
  walkEntries = [
    { isDirectory: true, path: '.git' },
    { isDirectory: false, path: '.git/config.js' },
    { isDirectory: false, path: 'src/b.js' },
  ];
  await formatFiles({ _: ['**/*.js'] });
  expect(getFormattedFiles()).toEqual(['src/b.js']);
});

test('node_modules entries are excluded unless in glob', async () => {
  walkEntries = [
    { isDirectory: false, path: 'node_modules/pkg/a.js' },
    { isDirectory: false, path: 'src/b.js' },
  ];
  await formatFiles({ _: ['src/**/*.js'] });
  // node_modules entry filtered out, only src/b.js remains
  expect(mockFs.readFile).toHaveBeenCalledWith(
    expect.stringContaining('src/b.js'),
    'utf8',
  );
});

test('eslint default ignores exclude .git entries', async () => {
  walkEntries = [
    { isDirectory: false, path: '.git/config.js' },
    { isDirectory: false, path: 'src/b.js' },
  ];
  await formatFiles({ _: ['**/*.js'] });
  expect(getFormattedFiles()).toEqual(['src/b.js']);
});

test('node_modules entries included when explicitly unignored', async () => {
  walkEntries = [
    { isDirectory: false, path: 'node_modules/pkg/a.js' },
    { isDirectory: false, path: 'src/b.js' },
  ];
  await formatFiles({
    _: ['**/*.js'],
    ignore: ['!**/node_modules/'],
  });
  expect(getFormattedFiles()).toEqual(['node_modules/pkg/a.js', 'src/b.js']);
});

test('node_modules entries stay ignored even when in glob', async () => {
  walkEntries = [
    { isDirectory: false, path: 'stuff1.js' },
    { isDirectory: false, path: 'stuff2.js' },
  ];
  await formatFiles({ _: ['node_modules/**/*.js'] });
  expect(getFormattedFiles()).toEqual([]);
});

test('user ignore globs filter entries', async () => {
  walkEntries = [
    { isDirectory: false, path: 'keep.js' },
    { isDirectory: false, path: 'skip/me.js' },
  ];
  await formatFiles({ _: ['src/**/*.js'], ignore: ['**/skip/**'] });
  expect(getFormattedFiles()).toEqual(['src/keep.js']);
});

test('user ignore globs use ESLint cwd-relative semantics', async () => {
  walkEntries = [
    { isDirectory: false, path: 'keep.js' },
    { isDirectory: false, path: 'skip.js' },
    { isDirectory: false, path: 'nested/skip.js' },
  ];
  await formatFiles({ _: ['src/**/*.js'], ignore: ['src/skip.js'] });
  expect(getFormattedFiles()).toEqual(['src/keep.js', 'src/nested/skip.js']);
});

test('user ignore globs use ESLint anchored semantics', async () => {
  walkEntries = [
    { isDirectory: false, path: 'skip/me.js' },
    { isDirectory: false, path: 'nested/skip/me.js' },
  ];
  await formatFiles({ _: ['src/**/*.js'], ignore: ['src/skip/**'] });
  expect(getFormattedFiles()).toEqual(['src/nested/skip/me.js']);
});

test('user ignore globs use ESLint directory semantics', async () => {
  walkEntries = [
    { isDirectory: false, path: 'keep/me.js' },
    { isDirectory: false, path: 'skip/me.js' },
    { isDirectory: false, path: 'nested/skip/me.js' },
  ];
  await formatFiles({ _: ['src/**/*.js'], ignore: ['**/skip'] });
  expect(getFormattedFiles()).toEqual(['src/keep/me.js']);
});

test('user ignore globs use ESLint negation semantics', async () => {
  walkEntries = [
    { isDirectory: false, path: 'drop.js' },
    { isDirectory: false, path: 'keep.js' },
    { isDirectory: false, path: 'nested/keep.js' },
  ];
  await formatFiles({
    _: ['src/**/*.js'],
    ignore: ['**/*.js', '!src/keep.js'],
  });
  expect(getFormattedFiles()).toEqual(['src/keep.js']);
});

test('dirs are pruned via directoryFilter when ConfigArray is loaded', async () => {
  findConfigFileMock.mockResolvedValue('test/eslint-ignore-config.js');
  walkEntries = [
    { isDirectory: false, path: 'keep.js' },
    { isDirectory: false, path: 'eslint-config-ignored/skip.js' },
  ];
  await formatFiles({ _: ['test/**/*.js'] });
  expect(hfs.walk).toHaveBeenCalledTimes(1);
  // both entries should pass (directoryFilter checks via ConfigArray)
  expect(mockFs.readFile).toHaveBeenCalledTimes(2);
});

test('eslintIgnore=false skips config and default ignores', async () => {
  walkEntries = [
    { isDirectory: false, path: 'node_modules/pkg/a.js' },
    { isDirectory: false, path: 'src/b.js' },
  ];
  await formatFiles({
    _: ['**/*.js'],
    eslintIgnore: false,
  });
  expect(findConfigFileMock).not.toHaveBeenCalled();
  expect(getFormattedFiles()).toEqual(['node_modules/pkg/a.js', 'src/b.js']);
});

test('auto-discovered config path may be absent', async () => {
  findConfigFileMock.mockResolvedValue(undefined);
  walkEntries = [{ isDirectory: false, path: 'keep.js' }];
  await formatFiles({
    _: ['coverage-test/**/*.js'],
    prettierIgnore: false,
    ignore: ['coverage-unique-glob'],
  });
  expect(findConfigFileMock).toHaveBeenCalled();
  expect(getFormattedFiles()).toEqual(['coverage-test/keep.js']);
});

test('explicit eslintConfigPath supports array configs', async () => {
  walkEntries = [
    { isDirectory: false, path: 'keep.js' },
    { isDirectory: false, path: 'eslint-config-ignored/skip.js' },
  ];
  await formatFiles({
    _: ['test/**/*.js'],
    eslintConfigPath: 'test/eslint-ignore-config.js',
  });
  expect(getFormattedFiles()).toEqual(['test/keep.js']);
});

test('eslint config base path does not prune cwd globs outside config dir', async () => {
  walkEntries = [
    { isDirectory: true, path: 'subdir' },
    { isDirectory: false, path: 'subdir/keep.js' },
  ];
  await formatFiles({
    _: ['src/**/*.js'],
    eslintConfigPath: 'test/eslint-ignore-config.js',
  });
  expect(getFormattedFiles()).toEqual(['src/subdir/keep.js']);
});

test('eslint config entry basePath stays relative to config file', async () => {
  walkEntries = [
    { isDirectory: false, path: 'build-output/skip.js' },
    { isDirectory: false, path: 'test/build-output/keep.js' },
  ];
  await formatFiles({
    _: ['**/*.js'],
    eslintConfigPath: 'test/eslint-cwd-config.js',
  });
  expect(getFormattedFiles()).toEqual(['test/build-output/keep.js']);
});

test('eslint config supports negation, scoped basePath, and non-global ignores', async () => {
  walkEntries = [
    { isDirectory: false, path: 'magic-ignored/drop.js' },
    { isDirectory: false, path: 'magic-ignored/keep.js' },
    { isDirectory: false, path: 'subdir/scoped-ignore/drop.js' },
    { isDirectory: false, path: 'not-a-global-ignore/keep.js' },
  ];
  await formatFiles({
    _: ['test/**/*.js'],
    eslintConfigPath: 'test/eslint-edge-config.js',
  });
  expect(getFormattedFiles()).toEqual([
    'test/magic-ignored/keep.js',
    'test/not-a-global-ignore/keep.js',
  ]);
});

test('eslint config preserves absolute basePath', async () => {
  walkEntries = [{ isDirectory: false, path: 'keep.js' }];
  await formatFiles({
    _: ['test/**/*.js'],
    eslintConfigPath: 'test/eslint-absolute-base-path-config.js',
  });
  expect(getFormattedFiles()).toEqual(['test/keep.js']);
});

test('eslint config with files but no ignores does not filter files', async () => {
  walkEntries = [{ isDirectory: false, path: 'keep.js' }];
  await formatFiles({
    _: ['test/**/*.js'],
    eslintConfigPath: 'test/eslint-files-only-config.js',
  });
  expect(getFormattedFiles()).toEqual(['test/keep.js']);
});

test('explicit eslintConfigPath is used', async () => {
  await formatFiles({
    _: ['src/**/*.js'],
    eslintConfigPath: 'my-config.js',
  });
  expect(findConfigFileMock).not.toHaveBeenCalled();
});

test('should accept stdin', async () => {
  const stdinContent = '  var [ foo, {  bar } ] = window.APP ;';
  mockedText.mockResolvedValue(stdinContent);
  await formatFiles({ stdin: true });
  expect(formatMock).toHaveBeenCalledTimes(1);
  const text = stdinContent.trim();
  expect(formatMock).toHaveBeenCalledWith(expect.objectContaining({ text }));
  expect(process.stdout.write).toHaveBeenCalledTimes(1);
  expect(process.stdout.write).toHaveBeenCalledWith('MOCK_OUTPUT for stdin');
});

test('handles stdin errors gracefully', async () => {
  mockedText.mockResolvedValue('MOCK_SYNTAX_ERROR');
  await formatFiles({ stdin: true });
  expect(console.error).toHaveBeenCalledTimes(1);
});

test('handles TTY stdin', async () => {
  const originalIsTTY = process.stdin.isTTY;
  process.stdin.isTTY = true;
  try {
    await formatFiles({ stdin: true });
    expect(mockText).not.toHaveBeenCalled();
    expect(formatMock).toHaveBeenCalledTimes(1);
  } finally {
    process.stdin.isTTY = originalIsTTY;
  }
});

test('handles non-TTY stdin', async () => {
  const originalIsTTY = process.stdin.isTTY;
  process.stdin.isTTY = false;
  const stdinContent = '  var [ foo, {  bar } ] = window.APP ;';
  mockedText.mockResolvedValue(stdinContent);
  try {
    await formatFiles({ stdin: true });
    expect(mockText).toHaveBeenCalledTimes(1);
    expect(mockText).toHaveBeenCalledWith(process.stdin);
    expect(formatMock).toHaveBeenCalledTimes(1);
  } finally {
    process.stdin.isTTY = originalIsTTY;
  }
});

test('wont save file if contents did not change', async () => {
  walkEntries = [{ isDirectory: false, path: 'no-change.js' }];
  await formatFiles({ _: ['no-change/*.js'], write: true });
  expect(mockedFs.readFile).toHaveBeenCalledWith(
    expect.stringContaining('no-change.js'),
    'utf8',
  );
  expect(mockFs.writeFile).toHaveBeenCalledTimes(0);
});

test('forwards logLevel onto prettier-eslint', async () => {
  walkEntries = [{ isDirectory: false, path: 'a.js' }];
  await formatFiles({ _: ['src/**/*.js'], logLevel: 'debug' });
  expect(formatMock).toHaveBeenCalledWith(
    expect.objectContaining({ logLevel: 'debug' }),
  );
});

test('forwards prettierLast onto prettier-eslint', async () => {
  walkEntries = [{ isDirectory: false, path: 'a.js' }];
  await formatFiles({ _: ['src/**/*.js'], prettierLast: true });
  expect(formatMock).toHaveBeenCalledWith(
    expect.objectContaining({ prettierLast: true }),
  );
});

test('forwards prettierOptions onto prettier-eslint', async () => {
  walkEntries = [{ isDirectory: false, path: 'a.js' }];
  await formatFiles({ _: ['src/**/*.js'], trailingComma: 'es5' });
  expect(formatMock).toHaveBeenCalledWith(
    expect.objectContaining({ prettierOptions: { trailingComma: 'es5' } }),
  );
});

describe('prettierIgnore', () => {
  test('prettier ignored files are skipped when writing', async () => {
    vi.mocked(findUpSync).mockImplementation(
      filename => `/${String(filename)}`,
    );
    walkEntries = [{ isDirectory: false, path: 'prettierignored.js' }];
    await formatFiles({ _: ['src/**/*.js'], write: true });
    expect(mockFs.writeFile).not.toHaveBeenCalled();
  });
});

describe('output', () => {
  test('writes to stdout when not writing', async () => {
    walkEntries = [{ isDirectory: false, path: 'a.js' }];
    await formatFiles({ _: ['src/**/*.js'] });
    expect(process.stdout.write).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledTimes(1); // success message
  });

  test('silent mode suppresses output', async () => {
    walkEntries = [{ isDirectory: false, path: 'a.js' }];
    const log = getLogger();
    await formatFiles({
      _: ['src/**/*.js'],
      write: true,
      logLevel: log.levels.SILENT,
    });
    expect(console.error).not.toHaveBeenCalled();
  });
});

describe('listDifferent', () => {
  test('list different files', async () => {
    walkEntries = [
      { isDirectory: false, path: 'a.js' },
      { isDirectory: false, path: 'b.js' },
    ];
    await formatFiles({ _: ['src/**/*.js'], listDifferent: true });
    expect(console.log).toHaveBeenCalledTimes(2);
    expect(process.exitCode).toBe(1);
  });

  test('wont error out when contents did not change', async () => {
    walkEntries = [{ isDirectory: false, path: 'no-change.js' }];
    await formatFiles({ _: ['no-change/*.js'], listDifferent: true });
    expect(process.exitCode).toBe(0);
  });
});
