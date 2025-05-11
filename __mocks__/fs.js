const readFile = jest.fn((filePath, encoding, callback) => {
  callback(null, `console.log('this is a mock thing for file: ${filePath}')`);
});
const writeFile = jest.fn((filePath, contents, callback) => {
  callback(null);
});

const readFileSync = jest.fn(filePath => {
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

module.exports = { readFile, writeFile, readFileSync, readdirSync };
