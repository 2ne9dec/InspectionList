import { defineConfig } from 'vitest/config';

/** Server tests: Node environment, без DOM. */
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['server/**/*.test.js'],
    exclude: ['server/node_modules/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['server/**/*.js'],
      exclude: ['server/node_modules/**'],
    },
  },
});
