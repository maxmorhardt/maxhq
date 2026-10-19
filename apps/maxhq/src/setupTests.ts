import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';

// default tests to reduced motion so animations render statically
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  configurable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: query.includes('prefers-reduced-motion'),
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// ensure fake timers and a stored color scheme never leak between tests
afterEach(() => {
  vi.useRealTimers();
  localStorage.clear();
});
