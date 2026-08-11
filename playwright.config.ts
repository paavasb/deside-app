import { defineConfig, devices } from '@playwright/test';

/**
 * Browser smoke tests.
 *
 * These run the real SPA against the Emulator Suite: real Auth, real Firestore
 * rules, real callable functions. Nothing is mocked, so a passing run proves the
 * critical flow — sign in, ask, vote, see results — actually works end to end.
 *
 * Requires a JDK 21+ for the Firestore/Auth emulators (see README.md).
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  timeout: 60_000,
  expect: { timeout: 15_000 },

  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // The v1 app was unusable on a phone; the responsive layout is worth covering.
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],

  webServer: [
    {
      // The emulators must be up before Vite, because the client connects to them
      // at module load.
      // `ui` is included so the hub on :4000 gives Playwright a readiness signal.
      command: 'firebase emulators:start --only auth,firestore,functions,ui --project demo-deside',
      url: 'http://127.0.0.1:4000',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: 'npm --prefix app run dev',
      url: 'http://127.0.0.1:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: { VITE_USE_EMULATORS: 'true' },
    },
  ],
});
