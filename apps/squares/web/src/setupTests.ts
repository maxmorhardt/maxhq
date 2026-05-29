// vitest setup file
import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';

// ensure fake timers never leak across test files
afterEach(() => {
  vi.useRealTimers();
});
