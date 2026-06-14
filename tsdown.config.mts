import { defineConfig } from 'tsdown';

export default defineConfig({
  clean: true,
  dts: false,
  entry: ['src/index.ts', 'src/no-main.ts'],
  format: 'cjs',
  outExtensions: () => ({ js: '.js' }),
  target: 'node20',
});
