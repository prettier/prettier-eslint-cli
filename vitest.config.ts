import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      exclude: ['**/__mocks__/**'],
      provider: 'v8',
      thresholds: {
        branches: 100,
        functions: 100,
        lines: 100,
        statements: 100,
      },
    },
    exclude: [
      '**/coverage/**',
      '**/dist/**',
      '**/fixtures/**',
      '**/node_modules/**',
    ],
    globals: true,
  },
});
