import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    exclude: ['node_modules/**', 'e2e/**', 'dist/**'],
    environmentMatchGlobs: [
      // Backend/AI tests run in node environment (no browser globals needed)
      ['src/__tests__/**', 'node'],
    ],
    env: {
      GOOGLE_API_KEY: process.env.GOOGLE_API_KEY ?? 'test-key',
      GOOGLE_GENAI_API_KEY: process.env.GOOGLE_GENAI_API_KEY ?? 'test-key',
      GEMINI_API_KEY: process.env.GEMINI_API_KEY ?? 'test-key',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        'dist/',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
