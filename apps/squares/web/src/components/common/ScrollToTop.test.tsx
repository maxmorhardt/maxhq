import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ScrollToTop from './ScrollToTop';

describe('ScrollToTop', () => {
  const scrollTo = vi.fn();
  const originalScrollTo = window.scrollTo;

  beforeEach(() => {
    window.scrollTo = scrollTo;
  });

  afterEach(() => {
    window.scrollTo = originalScrollTo;
    scrollTo.mockClear();
  });

  it('calls window.scrollTo(0, 0) on mount', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <ScrollToTop />
      </MemoryRouter>
    );
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it('renders nothing to the DOM', () => {
    const { container } = render(
      <MemoryRouter>
        <ScrollToTop />
      </MemoryRouter>
    );
    expect(container.firstChild).toBeNull();
  });
});
