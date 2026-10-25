import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';

// jsdom has no scrolling and logs "Not implemented" whenever a layout scrolls to the top
window.scrollTo = vi.fn();

// ensure fake timers never leak across test files
afterEach(() => {
  vi.useRealTimers();
});
