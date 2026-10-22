import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ErrorPage from './ErrorPage';
import { renderWithProviders } from '../testUtils';

describe('ErrorPage', () => {
  it('renders the error label and heading', () => {
    renderWithProviders(<ErrorPage />);

    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Something went wrong' })
    ).toBeInTheDocument();
  });

  it('offers links back into the site and a reload button', async () => {
    const reload = vi.fn();
    vi.spyOn(window, 'location', 'get').mockReturnValue({
      ...window.location,
      reload,
    } as unknown as Location);

    renderWithProviders(<ErrorPage />);

    expect(screen.getByRole('link', { name: /Home/ })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: /Contact/ })).toHaveAttribute('href', '/contact');

    await userEvent.click(screen.getByRole('button', { name: /Reload/ }));

    expect(reload).toHaveBeenCalledOnce();
  });

  it('asks crawlers not to index it and claims no canonical url', async () => {
    renderWithProviders(<ErrorPage />);

    await waitFor(() =>
      expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute(
        'content',
        'noindex, follow'
      )
    );

    expect(document.head.querySelector('link[rel="canonical"]')).toBeNull();
  });
});
