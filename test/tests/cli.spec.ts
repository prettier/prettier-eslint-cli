/* eslint no-console:0 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { oneLine, stripIndent } from 'common-tags';
import spawn from 'spawn-command';
import { vi } from 'vitest';

// this is a bit of a long running test...
vi.setConfig({ testTimeout: 20_000 });

const dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(dirname, '../..');
const PRETTIER_ESLINT_PATH = path.join(projectRoot, 'src/index.ts');

const nodeCommand = process.features.typescript
  ? 'node'
  : 'node --import @oxc-node/core/register';

testOutput('--version');

test('help outputs usage information and flags', async () => {
  // can't just do the testOutput function here because
  // the output is variable (based on the width of your
  // terminal I think)...
  const stdout = await runPrettierESLintCLI('--help');
  expect(stdout).toMatch(/Usage:.*?<globs>.../);
  expect(stdout).toContain('Valid options:\n');
  // just a sanity check.
  // If it's ever longer than 2000 then we've probably got a problem...

  if (stdout.length > 7200) {
    console.error(stdout);
    throw new Error(
      oneLine`
        We probably have a problem.
        The --help output is probably too long (${stdout.length})...
      `,
    );
  }
});

test('formats files and outputs to stdout', async () => {
  // can't just do the testOutput function here because
  // the output is in an undeterministic order
  const stdout = await runPrettierESLintCLI(
    'test/fixtures/stdout*.js --no-eslint-ignore --no-prettier-ignore',
  );
  expect(stdout).toContain(
    stripIndent(
      `
        import baz, { stuff } from 'fdjakfdlfw-baz';

        export { bazzy };

        function bazzy(something) {
          return baz(stuff(something));
        }
      `,
    ).trim(),
  );
  expect(stdout).toContain(
    stripIndent(
      `
        export default foo;

        function foo(thing) {
          return thing;
        }
      `,
    ).trim(),
  );
});

test('handles --eslint-config-path', async () => {
  // can't just do the testOutput function here because
  // the output is in an undeterministic order
  const stdout = await runPrettierESLintCLI(
    `test/fixtures/stdout1.js --no-eslint-ignore --no-prettier-ignore --eslint-config-path ${dirname}/../override-config.js`,
  );
  expect(stdout).toContain(
    stripIndent(
      `
        import baz, { stuff } from "fdjakfdlfw-baz";

        export { bazzy };

        function bazzy(something) {
          return baz(stuff(something));
        }
      `,
    ).trim(),
  );
});

test('list different files with the --list-different option', async () => {
  // can't just do the testOutput function here because
  // the output is in an indeterministic order
  const stdout = await runPrettierESLintCLI(
    'test/fixtures/stdout*.js --list-different --no-eslint-ignore --no-prettier-ignore',
  );
  expect(stdout).toContain('test/fixtures/stdout1.js');
  expect(stdout).toContain('test/fixtures/stdout2.js');
});

test('accepts stdin of code', async () => {
  const stdin = 'echo "console.log(   window.baz , typeof [] )  "';
  const stdout = await runPrettierESLintCLI('--stdin --parser babel', stdin);
  expect(stdout).toEqual('console.log(window.baz, typeof []);\n');
});

const writeCommand =
  'test/fixtures/example*.js --write --no-eslint-ignore --no-prettier-ignore';

test(`prettier-eslint ${writeCommand}`, async () => {
  // because we're using --write,
  // we have to recreate and delete the files every time
  const example1Path = path.resolve(dirname, '../fixtures/example1.js');
  const example2Path = path.resolve(dirname, '../fixtures/example2.js');
  try {
    const example1 = 'const {  example1  }  =  baz.bar';
    const example2 = 'function example2(thing){return thing;};;;;;;;;;';
    await Promise.all([
      fs.writeFile(example1Path, example1),
      fs.writeFile(example2Path, example2),
    ]);
    const stdout = await runPrettierESLintCLI(writeCommand);
    expect(stdout).toMatchSnapshot(`stdout: prettier-eslint ${writeCommand}`);
    const [example1Result, example2Result] = await Promise.all([
      fs.readFile(example1Path, 'utf8'),
      fs.readFile(example2Path, 'utf8'),
    ]);
    expect({ example1Result, example2Result }).toMatchSnapshot(
      `file contents: prettier-eslint ${writeCommand}`,
    );
  } finally {
    try {
      await Promise.all([fs.unlink(example1Path), fs.unlink(example2Path)]);
    } catch {
      // ignore error
    }
  }
});

function testOutput(command: string): void {
  test(`prettier-eslint ${command}`, async () => {
    const result = await runPrettierESLintCLI(command)
      .then(stdout => ({ output: stdout, type: 'stdout' as const }))
      .catch(error => ({ output: error, type: 'stderr' as const }));
    expect(result.output).toMatchSnapshot(`${result.type}: ${command}`);
  });
}

function runPrettierESLintCLI(args = '', stdin = ''): Promise<string> {
  const cwd = projectRoot;
  if (stdin) {
    stdin = `${stdin} |`;
  }

  return new Promise((resolve, reject) => {
    let stdout = '';
    let stderr = '';
    const command = `${stdin}${nodeCommand} ${PRETTIER_ESLINT_PATH} ${args}`;

    // prevent chalk to output colors
    const env = { ...process.env };
    env.TERM = 'dumb';
    delete env.CI;
    delete env.COLORTERM;
    delete env.FORCE_COLOR;

    const child = spawn(command, { cwd, env });

    child.on('error', error => {
      reject(error);
    });

    child.stdout.on('data', data => {
      stdout += data.toString();
    });

    child.stderr.on('data', data => {
      stderr += data.toString();
    });

    child.on('close', () => {
      if (!stderr || stderr.includes('success')) {
        resolve(relativeizePath(stdout || stderr));
      } else {
        reject(relativeizePath(stderr));
      }
    });
  });
}

function relativeizePath(stringWithAbsolutePaths: string): string {
  return stringWithAbsolutePaths.replaceAll(
    new RegExp(projectRoot, 'g'),
    '<projectRootDir>',
  );
}
