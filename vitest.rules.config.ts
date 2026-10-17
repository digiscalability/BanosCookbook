import { defineConfig } from 'vitest/config';

// Firestore rules tests: need the emulator, so they run via `npm run test:rules`
// (firebase emulators:exec) and are excluded from the default `npm test`.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/rules/**/*.test.ts'],
    testTimeout: 20000,
    hookTimeout: 30000,
    fileParallelism: false,
  },
});
