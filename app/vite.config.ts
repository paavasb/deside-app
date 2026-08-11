import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
// `vitest/config` re-exports Vite's defineConfig with the `test` block typed.
import { defineConfig } from 'vitest/config';

const rootDir = fileURLToPath(new URL('.', import.meta.url));
const sharedDir = fileURLToPath(new URL('../shared', import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': `${rootDir}src`,
      // Validation schemas and limits are shared verbatim with the Cloud Functions,
      // so the form rules a user sees are the rules the server enforces.
      '@shared': sharedDir,
      // Matches the tsconfig path mapping: `shared/` is outside this package, so
      // without this its `zod` import resolves against the repo root instead of the
      // copy the app is built and typechecked against.
      zod: `${rootDir}node_modules/zod`,
    },
  },
  server: {
    port: 5173,
    fs: {
      // `shared/` is outside the Vite root, so dev-server file access must allow it.
      allow: [rootDir, sharedDir],
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          // Firebase is large and versions on its own cadence; its own chunk means an
          // app deploy doesn't invalidate it in users' caches.
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/functions'],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
