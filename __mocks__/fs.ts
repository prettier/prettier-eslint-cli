const readFile = jest.fn(
  (
    filePath: string,
    _encoding: BufferEncoding,
    callback: (_error: NodeJS.ErrnoException | null, _data: string) => void,
  ) => {
    callback(null, `console.log('this is a mock thing for file: ${filePath}')`);
  },
);
const writeFile = jest.fn(
  (
    _filePath: string,
    _contents: string,
    callback: (_error: NodeJS.ErrnoException | null) => void,
  ) => {
    callback(null);
  },
);

const readFileSync = jest.fn((filePath: string) => {
  if (filePath.includes('.eslintrc') || filePath.includes('eslint.config.')) {
    return '{ "rules": { "semi": "error" } }';
  }

  if (filePath.includes('eslintignore')) {
    return '**/*eslintignored*\n';
  }

  if (filePath.includes('prettierignore')) {
    return '**/*prettierignored*\n';
  }

  throw new Error(`readFileSync mock does not yet handle ${filePath}`);
});

const readdirSync = jest.fn(() => []);

export = { readFile, writeFile, readFileSync, readdirSync };
