module.exports = {
  testEnvironment: "node",
  // TODO: test all the files...
  // collectCoverageFrom: ['src/**/*.js'],
  testPathIgnorePatterns: ["/node_modules/", "/fixtures/"],
  coveragePathIgnorePatterns: ["/node_modules/", "/fixtures/"],
  coverageThreshold: {
    global: {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100
    }
  }
};
