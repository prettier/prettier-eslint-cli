module.exports = jest.fn(function mockGetStdin() {
  return Promise.resolve(module.exports.stdin);
});

module.exports.stdin = '';
