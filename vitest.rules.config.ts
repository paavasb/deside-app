import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/rules/**/*.test.ts'],
    environment: 'node',
    // Rules tests share one emulated Firestore and clear it between tests, so they
    // must not run concurrently.
    fileParallelism: false,
    sequence: { concurrent: false },
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
});
