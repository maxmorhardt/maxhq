import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.ts',
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      thresholds: {
        lines: 50,
        functions: 50,
        branches: 50,
        statements: 50,
      },
      reporter: ['text', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/setupTests.ts',
        'src/types/',
        'src/vite-env.d.ts',
        'src/main.tsx',
        'src/**/*.test.{ts,tsx}',
        'coverage/',
        'test/',
        'public/',
        '*.config.*',
      ],
    },
  },
});
