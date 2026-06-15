import { vi } from 'vitest';

const readFile = vi.fn((filePath: string) => {
  if (filePath.includes('.eslintrc') || filePath.includes('eslint.config.')) {
    return Promise.resolve('{ "rules": { "semi": "error" } }');
  }

  if (filePath.includes('eslintignore')) {
    return Promise.resolve('**/*eslintignored*\n');
  }

  if (filePath.includes('prettierignore')) {
    return Promise.resolve('**/*prettierignored*\n');
  }

  return Promise.resolve(
    `console.log('this is a mock thing for file: ${filePath}')`,
  );
});

const writeFile = vi.fn(() => Promise.resolve());

export { readFile, writeFile };

export default { readFile, writeFile };
