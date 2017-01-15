// This is the mock that will be used in tests
// Jest sets this up automatically http://facebook.github.io/jest/docs/manual-mocks.html
// so we just return some spies here and assert that we're calling prettier-eslint APIs correctly
const format = jest.fn(({filePath}) => `MOCK_OUTPUT for ${filePath}`)

export default format
