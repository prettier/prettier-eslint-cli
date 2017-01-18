module.exports = jest.fn(function mockGlob(globString, callback) {
  if (globString.includes('1')) {
    callback(null, [
      '/Users/fredflintstone/Developer/top-secret/footless-carriage/index.js',
      '/Users/fredflintstone/Developer/top-secret/footless-carriage/start.js',
      '/Users/fredflintstone/Developer/top-secret/footless-carriage/stop/index.js',
      '/Users/fredflintstone/Developer/top-secret/footless-carriage/stop/log.js',
    ])
  } else if (globString.includes('2')) {
    callback(null, [
      '/Users/fredflintstone/Developer/top-secret/footless-carriage/index.js',
      '/Users/fredflintstone/Developer/top-secret/footless-carriage/start.js',
      '/Users/fredflintstone/Developer/top-secret/footless-carriage/continue/index.js',
      '/Users/fredflintstone/Developer/top-secret/footless-carriage/continue/forever.js',
    ])
  }
})
