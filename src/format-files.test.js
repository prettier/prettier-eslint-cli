import fsMock from 'fs'
import formatMock from 'prettier-eslint'
import formatFiles from './format-files'

jest.mock('fs')

test('sanity test', async () => {
  await formatFiles({_: ['src/**/*.js']})
  expect(formatMock).toHaveBeenCalledTimes(4)
  expect(fsMock.readFile).toHaveBeenCalledTimes(4)
  expect(fsMock.writeFile).toHaveBeenCalledTimes(4)
})
