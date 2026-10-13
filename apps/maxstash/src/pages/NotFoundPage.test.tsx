import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import NotFoundPage from './NotFoundPage';
import { renderWithProviders } from '../testUtils';

describe('NotFoundPage', () => {
  it('renders the 404 status label and heading', () => {
    renderWithProviders(<NotFoundPage />);

    expect(screen.getByText('404 · Not found')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 1, name: "This page doesn't exist" })
    ).toBeInTheDocument();
  });

  it('offers links back into the site', () => {
    renderWithProviders(<NotFoundPage />);

    expect(screen.getByRole('link', { name: /Home/ })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: /Projects/ })).toHaveAttribute('href', '/projects');
    expect(screen.getByRole('link', { name: /Contact/ })).toHaveAttribute('href', '/contact');
  });

  it('asks crawlers not to index it and claims no canonical url', async () => {
    renderWithProviders(<NotFoundPage />);

    await waitFor(() =>
      expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute(
        'content',
        'noindex, follow'
      )
    );

    expect(document.head.querySelector('link[rel="canonical"]')).toBeNull();
  });
});
