// jest.config.js
module.exports = {
    testEnvironment: 'node',
    collectCoverage: true,
    coverageReporters: ['text', 'lcov', 'clover'],
    coverageThreshold: {
      global: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
    testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],
    verbose: true,
  };
  