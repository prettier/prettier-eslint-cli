module.exports = jest.fn(function mockGlob(globString, options, callback) {
  if (globString.includes('1')) {
    callback(null, [
      fredProject('index.js'),
      fredProject('start.js'),
      fredProject('stop/index.js'),
      fredProject('stop/log.js'),
    ])
  } else if (globString.includes('2')) {
    callback(null, [
      fredProject('index.js'),
      fredProject('start.js'),
      fredProject('continue/index.js'),
      fredProject('continue/forever.js'),
    ])
  } else if (globString.includes('node_modules')) {
    callback(null, [
      fredProject('foo/node_modules/stuff1.js'),
      fredProject('foo/node_modules/stuff2.js'),
      fredProject('foo/node_modules/stuff3.js'),
    ])
  } else {
    throw new Error(`Your test globString: "${globString}" doesn't have associated mock data.`)
  }
})

function fredProject(path) {
  return `/Users/fredFlintstone/Developer/top-secret/footless-carriage/${path}`
}
