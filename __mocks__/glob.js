module.exports = jest.fn(function mockGlob(globString, callback) {
  callback(null, [
    '/Users/fredflintstone/Developer/top-secret/footless-carriage/index.js',
    '/Users/fredflintstone/Developer/top-secret/footless-carriage/start.js',
    '/Users/fredflintstone/Developer/top-secret/footless-carriage/stop/index.js',
    '/Users/fredflintstone/Developer/top-secret/footless-carriage/stop/log.js',
  ])
})
