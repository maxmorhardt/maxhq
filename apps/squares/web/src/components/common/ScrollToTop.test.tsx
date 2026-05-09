import { describe, it, expect, vi, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ScrollToTop from './ScrollToTop';

describe('ScrollToTop', () => {
  const originalScrollTo = window.scrollTo;

  afterEach(() => {
    window.scrollTo = originalScrollTo;
  });

  it('calls window.scrollTo(0, 0) on mount', () => {
    const scrollTo = vi.fn();
    window.scrollTo = scrollTo;
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
