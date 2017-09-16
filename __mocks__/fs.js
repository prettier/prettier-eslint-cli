const readFile = jest.fn((filePath, encoding, callback) => {
  callback(null, `console.log('this is a mock thing for file: ${filePath}')`)
})
const writeFile = jest.fn((filePath, contents, callback) => {
  callback(null)
})

const readFileSync = jest.fn(filePath => {
  if (filePath.indexOf('.eslintrc') !== -1) {
    return '{ "rules": { "semi": "error" } }'
  }

  if (filePath.indexOf('eslintignore') >= 0) {
    return '**/*eslintignored*\n'
  }

  if (filePath.indexOf('prettierignore') >= 0) {
    return '**/*prettierignored*\n'
  } else {
    throw new Error('readFileSync mock does not yet handle ', filePath)
  }
})

const readdirSync = jest.fn(() => {
  return []
})

module.exports = {readFile, writeFile, readFileSync, readdirSync}
