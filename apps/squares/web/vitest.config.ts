import { defineConfig, configDefaults } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.ts',
    exclude: [...configDefaults.exclude],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
      reporter: ['text', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/setupTests.ts',
        'src/types/',
        'src/vite-env.d.ts',
        'src/root.tsx',
        'src/routes.ts',
        'src/providers.tsx',
        'src/entry.client.tsx',
        'src/entry.server.tsx',
        'src/**/*.test.{ts,tsx}',
        'coverage/',
        'public/',
        '*.config.*',
      ],
    },
  },
});
