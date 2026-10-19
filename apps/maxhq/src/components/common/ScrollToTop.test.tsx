import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ScrollToTop from './ScrollToTop';
import { renderWithProviders } from '../../testUtils';

describe('ScrollToTop', () => {
  beforeEach(() => {
    window.scrollTo = vi.fn();
  });

  it('scrolls to the top on mount', () => {
    renderWithProviders(<ScrollToTop />);

    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it('scrolls to the top again when the route changes', async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <>
        <ScrollToTop />
        <Link to="/about">go</Link>
        <Routes>
          <Route path="/" element={<p>home</p>} />
          <Route path="/about" element={<p>about</p>} />
        </Routes>
      </>
    );

    vi.mocked(window.scrollTo).mockClear();
    await user.click(screen.getByRole('link', { name: 'go' }));

    expect(await screen.findByText('about')).toBeInTheDocument();
    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
  });
});
