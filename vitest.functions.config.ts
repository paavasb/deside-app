import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/functions/**/*.test.ts'],
    environment: 'node',
    // These hit one shared emulator suite and reset it between tests.
    fileParallelism: false,
    sequence: { concurrent: false },
    // Function cold starts in the emulator are slow on the first call.
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
