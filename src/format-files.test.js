/* eslint no-console:0 */
import fsMock from 'fs'
import formatMock from 'prettier-eslint'
import globMock from 'glob'
import mockGetStdin from 'get-stdin'
import formatFiles from './format-files'

jest.mock('fs')

beforeEach(() => {
  console.log = jest.fn()
  formatMock.mockClear()
})

test('sanity test', async () => {
  const globs = ['src/**/1*.js', 'src/**/2*.js']
  await formatFiles({_: globs})
  expect(globMock).toHaveBeenCalledTimes(globs.length)
  expect(fsMock.readFile).toHaveBeenCalledTimes(6)
  expect(formatMock).toHaveBeenCalledTimes(6)
  expect(fsMock.writeFile).toHaveBeenCalledTimes(0)
  expect(console.log).toHaveBeenCalledTimes(7)
  expect(console.log).toHaveBeenCalledWith(expect.stringMatching(/MOCK_OUTPUT.*index.js/))
  expect(console.log).toHaveBeenCalledWith(expect.stringMatching(/success.*6.*files/))
})

test('glob call inclues an ignore of node_modules', async () => {
  const fileGlob = 'src/**/1*.js'
  await formatFiles({_: [fileGlob]})
  expect(globMock).toHaveBeenCalledWith(
    fileGlob,
    expect.objectContaining({
      ignore: expect.arrayContaining(['**/node_modules/**']),
    }),
    expect.any(Function),
  )
})

test('glob call excludes an ignore of node_modules when the given glob includes node_modules', async () => {
  const fileGlob = 'foo/node_modules/stuff*.js'
  await formatFiles({_: [fileGlob]})
  expect(globMock).not.toHaveBeenCalledWith(
    expect.any,
    expect.objectContaining({
      // should not have an ignore with **/node_modules/**
      ignore: expect.arrayContaining(['**/node_modules/**']),
    }),
    expect.any,
  )
})

test('should accept stdin', async () => {
  mockGetStdin.stdin = '  var [ foo, {  bar } ] = window.APP ;'
  await formatFiles({stdin: true})
  expect(formatMock).toHaveBeenCalledTimes(1)
  expect(formatMock).toHaveBeenCalledWith(
    expect.objectContaining({
      text: mockGetStdin.stdin.trim(), // the trim is part of the test
    }),
  )
  expect(console.log).toHaveBeenCalledWith('MOCK_OUTPUT for stdin')
})

test('will write to files if that is specified', async () => {
  const fileGlob = 'src/**/1*.js'
  await formatFiles({_: [fileGlob], write: true})
  expect(fsMock.writeFile).toHaveBeenCalledTimes(4)
})
