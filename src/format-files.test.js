import fsMock from 'fs'
import formatMock from 'prettier-eslint'
import formatFiles from './format-files'

jest.mock('fs')

test('sanity test', async () => {
  await formatFiles({_: ['src/**/1*.js', 'src/**/2*.js']})
  expect(formatMock).toHaveBeenCalledTimes(6)
  expect(fsMock.readFile).toHaveBeenCalledTimes(6)
  expect(fsMock.writeFile).toHaveBeenCalledTimes(6)
})
